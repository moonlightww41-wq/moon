# Deployment

PCが起動していなくてもLINE Webhookを受けるため、GitHubにpushしたコードをクラウドへデプロイします。

## Option A: Render Free

一番簡単です。GitHubリポジトリをRenderに接続し、`render.yaml` のBlueprintとして作成します。

1. GitHubにこのフォルダをpush
2. Renderで `New` → `Blueprint`
3. このリポジトリを選択
4. `render.yaml` に表示される環境変数を設定
5. 発行されたURLの `/webhook/line` をLINE DevelopersのWebhook URLに設定

注意: Render Freeはスリープすることがあります。LINEの初回リクエストが遅れる可能性があります。

## Option B: Google Cloud Run

低頻度利用なら無料枠に収まりやすく、PC停止中でも安定します。GitHub Actionsからデプロイできます。

今回の推奨構成です。

Cloud Runは `min-instances 0` にして、LINEが来た時だけ起動します。WebhookはすぐLINEへ200を返し、その後にDrive/Calendar/CloudConvert処理を続けるため、デプロイ設定では `--no-cpu-throttling` を使っています。低頻度なら無料枠に収まりやすいですが、PDF処理が大量に走ると課金される可能性はあります。

必要なGitHub Secrets:

```text
GCP_PROJECT_ID
GCP_SERVICE_ACCOUNT_JSON
```

必要なGoogle Secret Manager secrets:

```text
LINE_CHANNEL_SECRET
LINE_CHANNEL_ACCESS_TOKEN
OPENAI_API_KEY
GOOGLE_OAUTH_CLIENT_ID
GOOGLE_OAUTH_CLIENT_SECRET
GOOGLE_OAUTH_REDIRECT_URI
GOOGLE_OAUTH_REFRESH_TOKEN
CLOUDCONVERT_API_KEY
DRIVE_STAGING_FOLDER_ID
PROCESSED_FOLDER_ID
CAL_ENDO
CAL_ENDO_NG
```

GitHubの `Deploy Cloud Run` workflowを手動実行、または `main` にpushするとデプロイされます。

発行されたCloud Run URLの `/webhook/line` をLINE Developersに設定します。

### Bootstrap helper

Google Cloud SDKが入っているPCまたはCloud Shellで実行できます。

```powershell
.\scripts\cloud-run-bootstrap.ps1 -ProjectId "<your-gcp-project-id>"
```

次に、Secret Managerへアプリ用の値を入れます。

```powershell
.\scripts\cloud-run-secrets.ps1 `
  -ProjectId "<your-gcp-project-id>" `
  -LineChannelSecret "<LINE channel secret>" `
  -LineChannelAccessToken "<LINE channel access token>" `
  -OpenAiApiKey "<OpenAI API key>" `
  -GoogleOauthClientId "<Google OAuth client id>" `
  -GoogleOauthClientSecret "<Google OAuth client secret>" `
  -GoogleOauthRedirectUri "http://localhost" `
  -GoogleOauthRefreshToken "<Google OAuth refresh token>" `
  -CloudConvertApiKey "<CloudConvert API key>" `
  -DriveStagingFolderId "1mI4vl_rmqYBvQdlpAkOw0unOClKVrE3d" `
  -ProcessedFolderId "1-4-RPnsBUUdE8s2YaicksoDN0h7G9F0m" `
  -CalEndo "m.endo3927@gmail.com" `
  -CalEndoNg "7a49d0c7396f95d1b938fd52365185436b8a09860c640af54a5ff5d8d85a7beb@group.calendar.google.com"
```

## Local GitHub Push

この環境には `gh` CLI が無かったため、自動でGitHubリポジトリ作成まではしていません。

```powershell
git init
git add .
git commit -m "Build LINE calendar drive bot"
git branch -M main
git remote add origin https://github.com/<owner>/<repo>.git
git push -u origin main
```
