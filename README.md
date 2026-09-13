# 麻雀 点数計算サバイバル

50〜110符・1〜4翻の点数計算を練習する、ブラウザだけで動く7択クイズです。

## 主な仕様

- 持ち点5,000点、最大60問、1問10秒
- 親ロン・親ツモ・子ロン・子ツモを各15問出題
- 同一条件の問題は60問の中で重複しません
- ロンとツモの回答候補を混在させません
- 表示上同じ点数は重複除去してから7択を作ります
- 切り上げ満貫（60符3翻）を採用しています
- 誤答時は実際の点棒移動全体の誤差を持ち点から引きます
- 時間切れは即終了です
- ベスト記録は使用中のブラウザ内に保存されます

## ファイル構成

```text
index.html          画面のHTMLとSNS用メタデータ
styles.css          配色、文字サイズ、レスポンシブ表示
scripts/data.js     点数表とゲーム設定
scripts/app.js      出題、選択肢、タイマー、減点、画面遷移
```

## ローカル確認

`index.html`をブラウザで直接開いて確認できます。より本番に近い確認をする場合は、このフォルダで簡易HTTPサーバーを起動します。

```bash
python -m http.server 8000
```

その後、ブラウザで `http://localhost:8000` を開きます。

## デバッグ

読み込み時に次の内容を自動検査します。

- 点数表が28行あること
- 全問題が112通りあること
- 7択に重複がないこと
- 正解が選択肢に1つだけ入ること
- 60問に同一問題がないこと
- 親子・ロンツモ・翻数の出題数が均等なこと
- ロン、親ツモ、子ツモの減点式

ブラウザの開発者ツールのコンソールでは、次を実行できます。

```javascript
MahjongQuizDebug.runSelfTests()
MahjongQuizDebug.buildQuestionSet(60)
MahjongQuizDebug.getState()
```

点数表を変更するときは `scripts/data.js` を編集してください。ゲームの設定値も同じファイルの `CONFIG` にまとめています。

## GitHub Pagesでの公開

1. GitHubで新しいリポジトリを作ります。
2. このフォルダ内のファイルとフォルダを、構造を保ったままリポジトリ直下へ置きます。
3. リポジトリの `Settings` → `Pages` を開きます。
4. `Deploy from a branch` を選択します。
5. 公開ブランチを `main`、フォルダを `/(root)` に設定します。
6. 表示された公開URLを開いて動作を確認します。

## NotebookLMで作成したサムネイルの追加

サムネイル画像を `assets/thumbnail.png` として配置します。その後、`index.html` の `<head>` 内へ、公開URLに合わせた以下の2行を追加します。

```html
<meta property="og:image" content="https://ユーザー名.github.io/リポジトリ名/assets/thumbnail.png">
<meta name="twitter:image" content="https://ユーザー名.github.io/リポジトリ名/assets/thumbnail.png">
```

Xのカード画像には絶対URLが必要なため、GitHub PagesのURLが決まってから追加してください。
