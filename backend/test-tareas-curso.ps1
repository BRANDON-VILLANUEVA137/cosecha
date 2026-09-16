# Prueba E2E: aislamiento de tareas por curso (temporal)
$ErrorActionPreference = 'Stop'
$base = 'http://localhost:3001/api'
$FBKEY = 'AIzaSyDWdA2A4AQbc9MwrHy4qWqffOGjaVn86Tg'

function Login($email, $pass) {
  $r = Invoke-RestMethod -Method Post -Uri "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=$FBKEY" -ContentType 'application/json' -Body (@{ email = $email; password = $pass; returnSecureToken = $true } | ConvertTo-Json)
  return @{ Token = $r.idToken; Uid = $r.localId; Headers = @{ Authorization = "Bearer $($r.idToken)" } }
}

# --- Setup: admin crea docentes A y B, cursos y estudiantes ---
$admin = Login 'admin@cosecha.com' 'admin123'
$docA = Invoke-RestMethod -Method Post -Uri "$base/admin/docentes" -Headers $admin.Headers -ContentType 'application/json' -Body (@{ nombre = 'Docente A E2E'; email = 'doca-e2e@cosecha.com'; password = 'test123'; especialidad = 'Mat' } | ConvertTo-Json)
$docB = Invoke-RestMethod -Method Post -Uri "$base/admin/docentes" -Headers $admin.Headers -ContentType 'application/json' -Body (@{ nombre = 'Docente B E2E'; email = 'docb-e2e@cosecha.com'; password = 'test123'; especialidad = 'Ing' } | ConvertTo-Json)
$cursoA = Invoke-RestMethod -Method Post -Uri "$base/admin/cursos" -Headers $admin.Headers -ContentType 'application/json' -Body (@{ nombre = 'Curso A E2E'; docenteId = $docA.id } | ConvertTo-Json)
$cursoB = Invoke-RestMethod -Method Post -Uri "$base/admin/cursos" -Headers $admin.Headers -ContentType 'application/json' -Body (@{ nombre = 'Curso B E2E'; docenteId = $docB.id } | ConvertTo-Json)
$estA = Invoke-RestMethod -Method Post -Uri "$base/admin/estudiantes" -Headers $admin.Headers -ContentType 'application/json' -Body (@{ nombre = 'Est A E2E'; email = 'esta-e2e@cosecha.com'; password = 'test123'; cursoId = $cursoA.id } | ConvertTo-Json)
$estB = Invoke-RestMethod -Method Post -Uri "$base/admin/estudiantes" -Headers $admin.Headers -ContentType 'application/json' -Body (@{ nombre = 'Est B E2E'; email = 'estb-e2e@cosecha.com'; password = 'test123'; cursoId = $cursoB.id } | ConvertTo-Json)
Write-Output 'SETUP-OK (2 docentes, 2 cursos, 2 estudiantes)'

# --- Docentes crean y publican sus tareas ---
$docALogin = Login 'doca-e2e@cosecha.com' 'test123'
$docBLogin = Login 'docb-e2e@cosecha.com' 'test123'
$tareaA = Invoke-RestMethod -Method Post -Uri "$base/tareas" -Headers $docALogin.Headers -ContentType 'application/json' -Body (@{ titulo = 'Tarea A'; materia = 'matematicas' } | ConvertTo-Json)
Invoke-RestMethod -Method Patch -Uri "$base/tareas/$($tareaA.id)/publicar" -Headers $docALogin.Headers -ContentType 'application/json' -Body (@{ estado = 'publicada' } | ConvertTo-Json) | Out-Null
$tareaB = Invoke-RestMethod -Method Post -Uri "$base/tareas" -Headers $docBLogin.Headers -ContentType 'application/json' -Body (@{ titulo = 'Tarea B'; materia = 'ingles' } | ConvertTo-Json)
Invoke-RestMethod -Method Patch -Uri "$base/tareas/$($tareaB.id)/publicar" -Headers $docBLogin.Headers -ContentType 'application/json' -Body (@{ estado = 'publicada' } | ConvertTo-Json) | Out-Null
Write-Output 'TAREAS-PUBLICADAS-OK'

# --- Estudiante A: solo debe ver la tarea del docente A ---
$estALogin = Login 'esta-e2e@cosecha.com' 'test123'
$tareasA = Invoke-RestMethod -Uri "$base/tareas" -Headers $estALogin.Headers
$veA = ($tareasA | Where-Object { $_.id -eq $tareaA.id }).Count -gt 0
$veB = ($tareasA | Where-Object { $_.id -eq $tareaB.id }).Count -gt 0
Write-Output ("EST-A: ve tarea de su docente=$veA (esperado True), ve tarea ajena=$veB (esperado False), total=" + $tareasA.Count)

# --- Estudiante B: solo debe ver la tarea del docente B ---
$estBLogin = Login 'estb-e2e@cosecha.com' 'test123'
$tareasB = Invoke-RestMethod -Uri "$base/tareas" -Headers $estBLogin.Headers
$veA2 = ($tareasB | Where-Object { $_.id -eq $tareaA.id }).Count -gt 0
$veB2 = ($tareasB | Where-Object { $_.id -eq $tareaB.id }).Count -gt 0
Write-Output ("EST-B: ve tarea de su docente=$veB2 (esperado True), ve tarea ajena=$veA2 (esperado False), total=" + $tareasB.Count)

# --- Limpieza ---
Invoke-RestMethod -Method Delete -Uri "$base/tareas/$($tareaA.id)" -Headers $docALogin.Headers | Out-Null
Invoke-RestMethod -Method Delete -Uri "$base/tareas/$($tareaB.id)" -Headers $docBLogin.Headers | Out-Null
Invoke-RestMethod -Method Delete -Uri "$base/admin/estudiantes/$($estA.id)?hardDelete=true" -Headers $admin.Headers | Out-Null
Invoke-RestMethod -Method Delete -Uri "$base/admin/estudiantes/$($estB.id)?hardDelete=true" -Headers $admin.Headers | Out-Null
Invoke-RestMethod -Method Delete -Uri "$base/admin/cursos/$($cursoA.id)" -Headers $admin.Headers | Out-Null
Invoke-RestMethod -Method Delete -Uri "$base/admin/cursos/$($cursoB.id)" -Headers $admin.Headers | Out-Null
Invoke-RestMethod -Method Delete -Uri "$base/admin/docentes/$($docA.id)" -Headers $admin.Headers | Out-Null
Invoke-RestMethod -Method Delete -Uri "$base/admin/docentes/$($docB.id)" -Headers $admin.Headers | Out-Null
Write-Output 'LIMPIEZA-OK'
