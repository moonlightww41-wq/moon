param(
  [Parameter(Mandatory=$true)][string]$ProjectId,
  [string]$Region = "asia-northeast1",
  [string]$ServiceAccountName = "line-calendar-drive-bot-deployer"
)

$ErrorActionPreference = "Stop"

gcloud config set project $ProjectId

gcloud services enable `
  run.googleapis.com `
  artifactregistry.googleapis.com `
  secretmanager.googleapis.com `
  iamcredentials.googleapis.com `
  cloudbuild.googleapis.com

$serviceAccountEmail = "$ServiceAccountName@$ProjectId.iam.gserviceaccount.com"

gcloud iam service-accounts create $ServiceAccountName `
  --display-name "LINE Calendar Drive Bot deployer" `
  2>$null

$roles = @(
  "roles/run.admin",
  "roles/artifactregistry.admin",
  "roles/iam.serviceAccountUser",
  "roles/secretmanager.secretAccessor"
)

foreach ($role in $roles) {
  gcloud projects add-iam-policy-binding $ProjectId `
    --member "serviceAccount:$serviceAccountEmail" `
    --role $role `
    --quiet
}

gcloud iam service-accounts keys create gcp-service-account.json `
  --iam-account $serviceAccountEmail

Write-Host ""
Write-Host "Created gcp-service-account.json"
Write-Host "Add GitHub secrets:"
Write-Host "  GCP_PROJECT_ID=$ProjectId"
Write-Host "  GCP_SERVICE_ACCOUNT_JSON=(contents of gcp-service-account.json)"
Write-Host ""
Write-Host "Then create app secrets with scripts/cloud-run-secrets.ps1"
