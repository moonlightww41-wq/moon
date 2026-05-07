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
