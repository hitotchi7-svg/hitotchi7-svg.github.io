/**
 * 麻雀 点数計算サバイバル
 *
 * 主な構成：
 * 1. データ検証
 * 2. 問題・選択肢生成
 * 3. 点棒誤差（ダメージ）計算
 * 4. タイマー
 * 5. 画面描画とゲーム進行
 *
 * デバッグ用APIはコンソールから MahjongQuizDebug で利用できます。
 */
(function initializeMahjongQuiz(global, document) {
  "use strict";

  const dataSource = global.MahjongQuizData;
  if (!dataSource) {
    showFatalError(new Error("MahjongQuizData が読み込まれていません。"));
    return;
  }

  const { config, scoreTable } = dataSource;

  const QUESTION_TYPES = Object.freeze([
    "child-ron",
    "child-tsumo",
    "dealer-ron",
    "dealer-tsumo"
  ]);

  const TYPE_LABELS = Object.freeze({
    "child-ron": { player: "子", win: "ロン" },
    "child-tsumo": { player: "子", win: "ツモ" },
    "dealer-ron": { player: "親", win: "ロン" },
    "dealer-tsumo": { player: "親", win: "ツモ" }
  });

  const state = {
    questions: [],
    currentIndex: 0,
    life: config.startingLife,
    correctCount: 0,
    currentStreak: 0,
    bestStreak: 0,
    totalDamage: 0,
    startedAt: 0,
    finishedAt: 0,
    timerId: null,
    deadline: 0,
    acceptingAnswer: false,
    lastResult: null
  };

  const elements = collectElements();

  try {
    runSelfTests();
    bindEvents();
    displayBestRecord();
  } catch (error) {
    showFatalError(error);
  }

  function collectElements() {
    const ids = [
      "start-screen", "quiz-screen", "feedback-screen", "result-screen", "error-screen",
      "start-button", "retry-button", "share-button", "next-button", "best-record",
      "question-progress", "life-points", "life-meter-bar", "timer-text", "timer-meter-bar",
      "question-heading", "question-prompt", "payment-guide", "answer-list", "quiz-live-region",
      "feedback-mark", "feedback-title", "correct-answer-text", "selected-answer-row",
      "selected-answer-text", "damage-message", "remaining-life", "result-mark", "result-status",
      "result-title", "result-score", "accuracy-result", "streak-result", "life-result",
      "time-result", "error-details"
    ];

    return ids.reduce((result, id) => {
      const element = document.getElementById(id);
      if (!element) throw new Error(`必要な画面要素 #${id} が見つかりません。`);
      result[toCamelCase(id)] = element;
      return result;
    }, {});
  }

  function toCamelCase(value) {
    return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  function bindEvents() {
    elements.startButton.addEventListener("click", startGame);
    elements.retryButton.addEventListener("click", startGame);
    elements.nextButton.addEventListener("click", proceedAfterFeedback);
    elements.shareButton.addEventListener("click", shareResult);
  }

  function startGame() {
    clearQuestionTimer();
    state.questions = buildQuestionSet(config.questionLimit);
    state.currentIndex = 0;
    state.life = config.startingLife;
    state.correctCount = 0;
    state.currentStreak = 0;
    state.bestStreak = 0;
    state.totalDamage = 0;
    state.startedAt = Date.now();
    state.finishedAt = 0;
    state.lastResult = null;
    showScreen("quiz");
    renderQuestion();
  }

  /**
   * 全112問から60問を選びます。
   * 同一問題を重複させず、4形式・4翻を各15問、7種類の符を8〜9問にします。
   * ランダムな貪欲選択が詰まった場合は最初からやり直します。
   */
  function buildQuestionSet(limit) {
    const allQuestions = createAllQuestions();
    const fuTargets = new Map(shuffle([...config.fuValues]).map((fu, index) => [fu, index < 4 ? 9 : 8]));

    for (let attempt = 0; attempt < 1000; attempt += 1) {
      const typeCounts = new Map(QUESTION_TYPES.map((type) => [type, 0]));
      const hanCounts = new Map(config.hanValues.map((han) => [han, 0]));
      const fuCounts = new Map(config.fuValues.map((fu) => [fu, 0]));
      const selected = [];

      for (const question of shuffle([...allQuestions])) {
        if (selected.length === limit) break;
        if (typeCounts.get(question.type) >= limit / QUESTION_TYPES.length) continue;
        if (hanCounts.get(question.han) >= limit / config.hanValues.length) continue;
        if (fuCounts.get(question.fu) >= fuTargets.get(question.fu)) continue;

        selected.push(question);
        typeCounts.set(question.type, typeCounts.get(question.type) + 1);
        hanCounts.set(question.han, hanCounts.get(question.han) + 1);
        fuCounts.set(question.fu, fuCounts.get(question.fu) + 1);
      }

      if (selected.length === limit) return shuffle(selected);
    }

    throw new Error("条件を満たす60問を生成できませんでした。");
  }

  function createAllQuestions() {
    return scoreTable.flatMap((row) => QUESTION_TYPES.map((type) => ({
      id: `${row.fu}-${row.han}-${type}`,
      fu: row.fu,
      han: row.han,
      type,
      answer: getAnswerForType(row, type)
    })));
  }

  function getAnswerForType(row, type) {
    switch (type) {
      case "child-ron": return row.childRon;
      case "child-tsumo": return [...row.childTsumo];
      case "dealer-ron": return row.dealerRon;
      case "dealer-tsumo": return row.dealerTsumo;
      default: throw new Error(`未対応の問題形式です: ${type}`);
    }
  }

  function renderQuestion() {
    const question = state.questions[state.currentIndex];
    if (!question) {
      finishGame("cleared");
      return;
    }

    const labels = TYPE_LABELS[question.type];
    elements.questionProgress.textContent = `第${state.currentIndex + 1}問／${config.questionLimit}問`;
    elements.questionHeading.textContent = `${labels.player}・${question.fu}符・${question.han}翻`;
    elements.questionPrompt.textContent = question.type.endsWith("ron")
      ? "ロンで和了しました。何点？"
      : question.type === "dealer-tsumo"
        ? "ツモで和了しました。子1人あたりの支払いは？"
        : "ツモで和了しました。支払いは？";
    elements.paymentGuide.hidden = question.type !== "child-tsumo";
    updateLifeDisplay();
    renderChoices(question);
    state.acceptingAnswer = true;
    startQuestionTimer();
  }

  function renderChoices(question) {
    const choices = createChoices(question);
    elements.answerList.replaceChildren();

    for (const choice of choices) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "answer-button";
      button.textContent = formatAnswer(choice, question.type);
      button.addEventListener("click", () => submitAnswer(choice));
      elements.answerList.append(button);
    }
  }

  /**
   * 表示上同じ選択肢が複数出ないよう、回答値をキー化して重複除去します。
   * ロン・親ツモは数値、子ツモは「子-親」の組をキーにします。
   */
  function createChoices(question) {
    const pool = uniqueAnswersForType(question.type);
    const correctKey = answerKey(question.answer);
    const wrongPool = pool.filter((answer) => answerKey(answer) !== correctKey);

    if (wrongPool.length < 6) {
      throw new Error(`${question.type} の誤答候補が6種類未満です。`);
    }

    const choices = [...shuffle(wrongPool).slice(0, 6), cloneAnswer(question.answer)];
    const uniqueCount = new Set(choices.map(answerKey)).size;
    if (uniqueCount !== 7) throw new Error("選択肢の重複を検出しました。");

    return shuffle(choices);
  }

  function uniqueAnswersForType(type) {
    const unique = new Map();
    for (const row of scoreTable) {
      const answer = getAnswerForType(row, type);
      unique.set(answerKey(answer), cloneAnswer(answer));
    }
    return [...unique.values()];
  }

  function answerKey(answer) {
    return Array.isArray(answer) ? answer.join("-") : String(answer);
  }

  function cloneAnswer(answer) {
    return Array.isArray(answer) ? [...answer] : answer;
  }

  function submitAnswer(selectedAnswer) {
    if (!state.acceptingAnswer) return;
    state.acceptingAnswer = false;
    clearQuestionTimer();
    disableAnswerButtons();

    const question = state.questions[state.currentIndex];
    const isCorrect = answerKey(selectedAnswer) === answerKey(question.answer);
    const damage = isCorrect ? 0 : calculateDamage(question.type, question.answer, selectedAnswer);

    if (isCorrect) {
      state.correctCount += 1;
      state.currentStreak += 1;
      state.bestStreak = Math.max(state.bestStreak, state.currentStreak);
    } else {
      state.currentStreak = 0;
      state.totalDamage += damage;
      state.life = Math.max(0, state.life - damage);
    }

    state.lastResult = { isCorrect, damage, selectedAnswer, question, timedOut: false };
    showFeedback();
  }

  /**
   * 実際の点棒移動全体に生じる差をダメージとします。
   * ロン：支払者1人
   * 親ツモ：子3人
   * 子ツモ：子2人＋親1人
   */
  function calculateDamage(type, correct, selected) {
    if (type.endsWith("ron")) return Math.abs(correct - selected);
    if (type === "dealer-tsumo") return Math.abs(correct - selected) * 3;
    if (type === "child-tsumo") {
      return Math.abs(correct[0] - selected[0]) * 2 + Math.abs(correct[1] - selected[1]);
    }
    throw new Error(`ダメージを計算できない問題形式です: ${type}`);
  }

  function startQuestionTimer() {
    clearQuestionTimer();
    state.deadline = performance.now() + config.secondsPerQuestion * 1000;
    updateTimerDisplay(config.secondsPerQuestion * 1000);
    state.timerId = global.setInterval(() => {
      const remainingMs = Math.max(0, state.deadline - performance.now());
      updateTimerDisplay(remainingMs);
      if (remainingMs <= 0) handleTimeout();
    }, 50);
  }

  function updateTimerDisplay(remainingMs) {
    const remainingSeconds = Math.ceil(remainingMs / 1000);
    const ratio = Math.max(0, remainingMs / (config.secondsPerQuestion * 1000));
    const timerRow = elements.timerText.parentElement;
    elements.timerText.textContent = `残り${remainingSeconds}秒`;
    elements.timerMeterBar.style.width = `${ratio * 100}%`;
    timerRow.classList.toggle("is-urgent", remainingMs <= 3000);
    elements.timerMeterBar.parentElement.setAttribute("aria-valuenow", String(Math.ceil(remainingMs / 1000)));
  }

  function handleTimeout() {
    if (!state.acceptingAnswer) return;
    state.acceptingAnswer = false;
    clearQuestionTimer();
    disableAnswerButtons();
    state.currentStreak = 0;
    state.life = 0;
    const question = state.questions[state.currentIndex];
    state.lastResult = { isCorrect: false, damage: 0, selectedAnswer: null, question, timedOut: true };
    showFeedback();
  }

  function clearQuestionTimer() {
    if (state.timerId !== null) {
      global.clearInterval(state.timerId);
      state.timerId = null;
    }
  }

  function disableAnswerButtons() {
    elements.answerList.querySelectorAll("button").forEach((button) => { button.disabled = true; });
  }

  function showFeedback() {
    const result = state.lastResult;
    const gameOver = state.life <= 0;
    showScreen("feedback");

    elements.feedbackMark.classList.toggle("is-wrong", !result.isCorrect);
    elements.feedbackMark.textContent = result.isCorrect ? "○" : "×";
    elements.feedbackTitle.textContent = result.timedOut ? "時間切れ" : result.isCorrect ? "正解！" : "不正解";
    elements.correctAnswerText.textContent = formatAnswer(result.question.answer, result.question.type);
    elements.selectedAnswerRow.hidden = result.timedOut;
    elements.selectedAnswerText.textContent = result.selectedAnswer === null
      ? "未回答"
      : formatAnswer(result.selectedAnswer, result.question.type);

    if (result.timedOut) {
      elements.damageMessage.textContent = "時間切れのため終了です";
    } else if (result.isCorrect) {
      elements.damageMessage.textContent = "持ち点を維持しました";
    } else {
      elements.damageMessage.textContent = `点棒の誤差 −${formatNumber(result.damage)}点`;
    }

    elements.remainingLife.textContent = `残り持ち点 ${formatNumber(state.life)}点`;
    elements.nextButton.textContent = gameOver ? "結果を見る" : "次の問題へ";
    elements.nextButton.focus();
  }

  function proceedAfterFeedback() {
    if (state.life <= 0) {
      finishGame(state.lastResult?.timedOut ? "timeout" : "busted");
      return;
    }

    state.currentIndex += 1;
    if (state.currentIndex >= config.questionLimit) {
      finishGame("cleared");
      return;
    }

    showScreen("quiz");
    renderQuestion();
  }

  function finishGame(reason) {
    clearQuestionTimer();
    state.finishedAt = Date.now();
    const answeredCount = reason === "timeout" ? state.currentIndex : Math.min(state.currentIndex + 1, config.questionLimit);
    const accuracyBase = reason === "timeout" ? state.currentIndex + 1 : answeredCount;
    const accuracy = accuracyBase === 0 ? 0 : (state.correctCount / accuracyBase) * 100;
    const elapsedSeconds = Math.max(0, Math.round((state.finishedAt - state.startedAt) / 1000));

    const result = {
      reason,
      answeredCount: reason === "cleared" ? config.questionLimit : state.currentIndex + 1,
      correctCount: state.correctCount,
      accuracy,
      bestStreak: state.bestStreak,
      life: state.life,
      elapsedSeconds
    };

    saveBestRecord(result);
    state.lastResult = { ...state.lastResult, final: result };
    renderResult(result);
    showScreen("result");
  }

  function renderResult(result) {
    const cleared = result.reason === "cleared";
    elements.resultMark.textContent = cleared ? "祝" : "東";
    elements.resultStatus.textContent = cleared ? "全60問クリア" : result.reason === "timeout" ? "TIME UP" : "GAME OVER";
    elements.resultTitle.textContent = cleared ? "生き残りました！" : `${result.answeredCount}問目で終了`;
    elements.resultScore.textContent = `${result.correctCount}問正解`;
    elements.accuracyResult.textContent = `${result.accuracy.toFixed(1)}%`;
    elements.streakResult.textContent = `${result.bestStreak}問`;
    elements.lifeResult.textContent = `${formatNumber(result.life)}点`;
    elements.timeResult.textContent = formatDuration(result.elapsedSeconds);
  }

  function showScreen(name) {
    const screenMap = {
      start: elements.startScreen,
      quiz: elements.quizScreen,
      feedback: elements.feedbackScreen,
      result: elements.resultScreen,
      error: elements.errorScreen
    };

    for (const screen of Object.values(screenMap)) screen.hidden = true;
    screenMap[name].hidden = false;
  }

  function updateLifeDisplay() {
    elements.lifePoints.textContent = `持ち点 ${formatNumber(state.life)}`;
    const percentage = Math.max(0, Math.min(100, (state.life / config.startingLife) * 100));
    elements.lifeMeterBar.style.width = `${percentage}%`;
    elements.lifeMeterBar.parentElement.setAttribute("aria-valuenow", String(state.life));
  }

  function formatAnswer(answer, type) {
    if (type === "child-tsumo") return `${formatNumber(answer[0])} ／ ${formatNumber(answer[1])}`;
    if (type === "dealer-tsumo") return `${formatNumber(answer)}オール`;
    return `${formatNumber(answer)}点`;
  }

  function formatNumber(value) {
    return Number(value).toLocaleString("ja-JP");
  }

  function formatDuration(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  function shuffle(items) {
    for (let index = items.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [items[index], items[randomIndex]] = [items[randomIndex], items[index]];
    }
    return items;
  }

  function shareResult() {
    const result = state.lastResult?.final;
    if (!result) return;
    const headline = result.reason === "cleared" ? "全60問を完走！" : `${result.answeredCount}問目まで生存！`;
    const text = [
      "麻雀 点数計算サバイバル",
      headline,
      `${result.correctCount}問正解／正答率${result.accuracy.toFixed(1)}%`,
      `残り持ち点${formatNumber(result.life)}点`,
      "#麻雀点数計算サバイバル"
    ].join("\n");
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(global.location.href)}`;
    global.open(shareUrl, "_blank", "noopener,noreferrer");
  }

  function saveBestRecord(result) {
    try {
      const existing = JSON.parse(global.localStorage.getItem("mahjongQuizBest") || "null");
      const isBetter = !existing
        || result.answeredCount > existing.answeredCount
        || (result.answeredCount === existing.answeredCount && result.life > existing.life)
        || (result.answeredCount === existing.answeredCount && result.life === existing.life && result.correctCount > existing.correctCount);
      if (isBetter) global.localStorage.setItem("mahjongQuizBest", JSON.stringify(result));
    } catch (error) {
      console.warn("ベスト記録を保存できませんでした。", error);
    }
  }

  function displayBestRecord() {
    try {
      const best = JSON.parse(global.localStorage.getItem("mahjongQuizBest") || "null");
      if (!best) return;
      elements.bestRecord.textContent = `自己ベスト：${best.answeredCount}問到達・${best.correctCount}問正解`;
      elements.bestRecord.hidden = false;
    } catch (error) {
      console.warn("ベスト記録を読み込めませんでした。", error);
    }
  }

  /** 起動時検査。失敗時は公開画面ではなくエラー画面を表示します。 */
  function runSelfTests() {
    assert(scoreTable.length === 28, `点数表は28行必要です。現在: ${scoreTable.length}`);
    assert(createAllQuestions().length === 112, "全問題数が112問ではありません。");

    const rowKeys = scoreTable.map((row) => `${row.fu}-${row.han}`);
    assert(new Set(rowKeys).size === 28, "点数表に符・翻数の重複があります。");

    for (const type of QUESTION_TYPES) {
      assert(uniqueAnswersForType(type).length >= 7, `${type} の固有回答が7種類未満です。`);
    }

    for (const question of createAllQuestions()) {
      const choices = createChoices(question);
      assert(choices.length === 7, `${question.id}: 選択肢が7個ではありません。`);
      assert(new Set(choices.map(answerKey)).size === 7, `${question.id}: 選択肢が重複しています。`);
      assert(choices.filter((choice) => answerKey(choice) === answerKey(question.answer)).length === 1,
        `${question.id}: 正解が1個ではありません。`);
    }

    for (let run = 0; run < 25; run += 1) {
      const set = buildQuestionSet(config.questionLimit);
      assert(set.length === 60, "出題セットが60問ではありません。");
      assert(new Set(set.map((question) => question.id)).size === 60, "出題セットに同一問題があります。");
      for (const type of QUESTION_TYPES) {
        assert(set.filter((question) => question.type === type).length === 15, `${type} が15問ではありません。`);
      }
      for (const han of config.hanValues) {
        assert(set.filter((question) => question.han === han).length === 15, `${han}翻が15問ではありません。`);
      }
    }

    assert(calculateDamage("dealer-tsumo", 2300, 2000) === 900, "親ツモの減点計算が不正です。‌");
    assert(calculateDamage("child-tsumo", [1200, 2300], [1000, 2000]) === 700, "子ツモの減点計算が不正です。‌");
    assert(calculateDamage("child-ron", 6800, 5800) === 1000, "ロンの減点計算が不正です。‌");

    return { ok: true, scoreRows: scoreTable.length, totalQuestions: 112 };
  }

  function assert(condition, message) {
    if (!condition) throw new Error(message);
  }

  function showFatalError(error) {
    console.error(error);
    const errorScreen = document.getElementById("error-screen");
    const errorDetails = document.getElementById("error-details");
    document.querySelectorAll(".screen").forEach((screen) => { screen.hidden = true; });
    if (errorDetails) errorDetails.textContent = error instanceof Error ? error.stack || error.message : String(error);
    if (errorScreen) errorScreen.hidden = false;
  }

  global.MahjongQuizDebug = Object.freeze({
    runSelfTests,
    createAllQuestions,
    buildQuestionSet,
    createChoices,
    calculateDamage,
    getState: () => ({ ...state, questions: [...state.questions] })
  });
})(window, document);
