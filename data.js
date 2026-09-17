/**
 * 麻雀点数計算クイズの正解データ。
 *
 * データとゲーム処理を分離し、点数表の変更時にこのファイルだけを
 * 確認すればよい構成にしています。
 *
 * childTsumo: [子1人の支払い, 親の支払い]
 * dealerTsumo: 子1人あたりの支払い（オール）
 */
(function exposeMahjongQuizData(global) {
  "use strict";

  const SCORE_TABLE = [
    { fu: 50, han: 1, childRon: 1600, childTsumo: [400, 800],   dealerRon: 2400,  dealerTsumo: 800 },
    { fu: 50, han: 2, childRon: 3200, childTsumo: [800, 1600],  dealerRon: 4800,  dealerTsumo: 1600 },
    { fu: 50, han: 3, childRon: 6400, childTsumo: [1600, 3200], dealerRon: 9600,  dealerTsumo: 3200 },
    { fu: 50, han: 4, childRon: 8000, childTsumo: [2000, 4000], dealerRon: 12000, dealerTsumo: 4000 },

    { fu: 60, han: 1, childRon: 2000, childTsumo: [500, 1000],  dealerRon: 2900,  dealerTsumo: 1000 },
    { fu: 60, han: 2, childRon: 3900, childTsumo: [1000, 2000], dealerRon: 5800,  dealerTsumo: 2000 },
    { fu: 60, han: 3, childRon: 8000, childTsumo: [2000, 4000], dealerRon: 12000, dealerTsumo: 4000 },
    { fu: 60, han: 4, childRon: 8000, childTsumo: [2000, 4000], dealerRon: 12000, dealerTsumo: 4000 },

    { fu: 70, han: 1, childRon: 2300, childTsumo: [600, 1200],  dealerRon: 3400,  dealerTsumo: 1200 },
    { fu: 70, han: 2, childRon: 4500, childTsumo: [1200, 2300], dealerRon: 6800,  dealerTsumo: 2300 },
    { fu: 70, han: 3, childRon: 8000, childTsumo: [2000, 4000], dealerRon: 12000, dealerTsumo: 4000 },
    { fu: 70, han: 4, childRon: 8000, childTsumo: [2000, 4000], dealerRon: 12000, dealerTsumo: 4000 },

    { fu: 80, han: 1, childRon: 2600, childTsumo: [700, 1300],  dealerRon: 3900,  dealerTsumo: 1300 },
    { fu: 80, han: 2, childRon: 5200, childTsumo: [1300, 2600], dealerRon: 7700,  dealerTsumo: 2600 },
    { fu: 80, han: 3, childRon: 8000, childTsumo: [2000, 4000], dealerRon: 12000, dealerTsumo: 4000 },
    { fu: 80, han: 4, childRon: 8000, childTsumo: [2000, 4000], dealerRon: 12000, dealerTsumo: 4000 },

    { fu: 90, han: 1, childRon: 2900, childTsumo: [800, 1500],  dealerRon: 4400,  dealerTsumo: 1500 },
    { fu: 90, han: 2, childRon: 5800, childTsumo: [1500, 2900], dealerRon: 8700,  dealerTsumo: 2900 },
    { fu: 90, han: 3, childRon: 8000, childTsumo: [2000, 4000], dealerRon: 12000, dealerTsumo: 4000 },
    { fu: 90, han: 4, childRon: 8000, childTsumo: [2000, 4000], dealerRon: 12000, dealerTsumo: 4000 },

    { fu: 100, han: 1, childRon: 3200, childTsumo: [800, 1600],  dealerRon: 4800,  dealerTsumo: 1600 },
    { fu: 100, han: 2, childRon: 6400, childTsumo: [1600, 3200], dealerRon: 9600,  dealerTsumo: 3200 },
    { fu: 100, han: 3, childRon: 8000, childTsumo: [2000, 4000], dealerRon: 12000, dealerTsumo: 4000 },
    { fu: 100, han: 4, childRon: 8000, childTsumo: [2000, 4000], dealerRon: 12000, dealerTsumo: 4000 },

    { fu: 110, han: 1, childRon: 3600, childTsumo: [900, 1800],  dealerRon: 5300,  dealerTsumo: 1800 },
    { fu: 110, han: 2, childRon: 7100, childTsumo: [1800, 3600], dealerRon: 10600, dealerTsumo: 3600 },
    { fu: 110, han: 3, childRon: 8000, childTsumo: [2000, 4000], dealerRon: 12000, dealerTsumo: 4000 },
    { fu: 110, han: 4, childRon: 8000, childTsumo: [2000, 4000], dealerRon: 12000, dealerTsumo: 4000 }
  ];

  const CONFIG = Object.freeze({
    startingLife: 5000,
    questionLimit: 60,
    secondsPerQuestion: 10,
    fuValues: Object.freeze([50, 60, 70, 80, 90, 100, 110]),
    hanValues: Object.freeze([1, 2, 3, 4])
  });

  global.MahjongQuizData = Object.freeze({
    config: CONFIG,
    scoreTable: Object.freeze(SCORE_TABLE.map((row) => Object.freeze({
      ...row,
      childTsumo: Object.freeze([...row.childTsumo])
    })))
  });
})(window);
