param(
  [Parameter(Mandatory=$true)][string]$ProjectId,
  [Parameter(Mandatory=$true)][string]$LineChannelSecret,
  [Parameter(Mandatory=$true)][string]$LineChannelAccessToken,
  [Parameter(Mandatory=$true)][string]$OpenAiApiKey,
  [Parameter(Mandatory=$true)][string]$GoogleOauthClientId,
  [Parameter(Mandatory=$true)][string]$GoogleOauthClientSecret,
  [Parameter(Mandatory=$true)][string]$GoogleOauthRedirectUri,
  [Parameter(Mandatory=$true)][string]$GoogleOauthRefreshToken,
  [string]$CloudConvertApiKey = "",
  [string]$DriveStagingFolderId = "",
  [string]$ProcessedFolderId = "",
  [string]$CalEndo = "primary",
  [string]$CalEndoNg = ""
)

$ErrorActionPreference = "Stop"
gcloud config set project $ProjectId

function Set-Secret($Name, $Value) {
  if (-not $Value) { $Value = "unused" }
  $exists = gcloud secrets describe $Name --format="value(name)" 2>$null
  if (-not $exists) {
    gcloud secrets create $Name --replication-policy="automatic"
  }
  $Value | gcloud secrets versions add $Name --data-file=-
}

Set-Secret "LINE_CHANNEL_SECRET" $LineChannelSecret
Set-Secret "LINE_CHANNEL_ACCESS_TOKEN" $LineChannelAccessToken
Set-Secret "OPENAI_API_KEY" $OpenAiApiKey
Set-Secret "GOOGLE_OAUTH_CLIENT_ID" $GoogleOauthClientId
Set-Secret "GOOGLE_OAUTH_CLIENT_SECRET" $GoogleOauthClientSecret
Set-Secret "GOOGLE_OAUTH_REDIRECT_URI" $GoogleOauthRedirectUri
Set-Secret "GOOGLE_OAUTH_REFRESH_TOKEN" $GoogleOauthRefreshToken
Set-Secret "CLOUDCONVERT_API_KEY" $CloudConvertApiKey
Set-Secret "DRIVE_STAGING_FOLDER_ID" $DriveStagingFolderId
Set-Secret "PROCESSED_FOLDER_ID" $ProcessedFolderId
Set-Secret "CAL_ENDO" $CalEndo
Set-Secret "CAL_ENDO_NG" $CalEndoNg

Write-Host "Cloud Run secrets are ready."
