wsl -d Ubuntu-26.04 -- kubectl port-forward `
  -n observabilidade-portal pod/scheduler-postgres-0 `
  54320:5432

Host: localhost
Porta: 54320
Database: scheduler
Usuário: scheduler
SSL: disable


$encoded = (wsl -d Ubuntu-26.04 -- kubectl get secret scheduler-database `
  -n observabilidade-portal `
  -o 'jsonpath={.data.password}').Trim()

[Text.Encoding]::UTF8.GetString(
  [Convert]::FromBase64String($encoded)
) | Set-Clipboard

Remove-Variable encoded