# LINE Calendar / Drive Bot

n8n の代替として動かせる小さな LINE Webhook アプリです。追加コストを抑えるため、常時サーバーさえ用意できれば Node.js だけで動きます。

## できること

- ラフなLINE文からGoogleカレンダー登録
  - 例: `今日の15時から16時に面談`
  - 例: `明日 10-11 田中さん打ち合わせ`
  - 例: `来週月曜14時から営業MTG`
- 既存の `【SYSTEM】...【/SYSTEM】` 形式から `.txt` 作成してGoogle Drive保存
- LINEのPDF/file/image/video/audioをGoogle Drive保存
- `CLOUDCONVERT_API_KEY` がある場合、PDFを軽量化して保存

## セットアップ

```powershell
npm install
Copy-Item .env.example .env
npm run check
npm start
```

`.env` に LINE / OpenAI / Google の認証情報を入れてください。

## Webhook URL

LINE Developers の Webhook URL に設定します。

```text
https://your-domain.example/webhook/line
```

ローカル検証だけなら Cloudflare Tunnel など無料枠のトンネルを使えます。
PC停止中でも動かす本番運用は [DEPLOY.md](./DEPLOY.md) を見て、RenderまたはCloud Runにデプロイしてください。

## Google認証

個人のGoogleカレンダー/Driveに書き込むなら、OAuth refresh token が一番扱いやすいです。

Google Cloud ConsoleでOAuthクライアントを作り、`.env` に `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` / `GOOGLE_OAUTH_REDIRECT_URI` を入れたあと、次を実行します。

```powershell
npm run google:oauth
```

表示されたURLを開いて許可し、リダイレクトURLの `code=` の値を貼ると `GOOGLE_OAUTH_REFRESH_TOKEN` が表示されます。

サービスアカウントを使う場合は、対象のカレンダー・Driveフォルダ・Sheetsをサービスアカウントのメールアドレスに共有してください。

## 注意

このリポジトリには秘密情報を入れないでください。LINEアクセストークンやCloudConvert APIキーを貼ってしまった場合は、再発行してください。
