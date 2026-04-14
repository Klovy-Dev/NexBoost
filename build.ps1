# ── Script de build NexBoost ──────────────────────────────────
# Lance : .\build.ps1
# Génère le .exe signé dans src-tauri/target/release/bundle/

$env:TAURI_SIGNING_PRIVATE_KEY = "dW50cnVzdGVkIGNvbW1lbnQ6IHJzaWduIGVuY3J5cHRlZCBzZWNyZXQga2V5ClJXUlRZMEl5YW9tWHgxZm0rZGVCKytCUkdVNlh1MVE4cmJwc3pCK0sxTUJnaGJ6YXdja0FBQkFBQUFBQUFBQUFBQUlBQUFBQUY3MGNTM0RYSGVFRzd4OXFmakUwTWpOUmJVenhiSHVFK1gxbk5BNEN1eHpyRndXdTRmSFhTUWNGS1Ryc1pmWUlYRUNwWlRaZTE5YmFvcEhuamdjV2RKb3AzOXVqNXU5U2Nuc1VQUStlRGlXQnJrVk1ZSlBpYTA3TU1BSm1JMFNESDU5UGR5Q3JxaHc9Cg=="
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = ""

Write-Host "Building NexBoost..." -ForegroundColor Cyan
npm run tauri build

Write-Host ""
Write-Host "Build termine !" -ForegroundColor Green
Write-Host "Fichiers generes dans : src-tauri\target\release\bundle\" -ForegroundColor Yellow
