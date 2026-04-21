param(
    [string]$OutputPath = 'appendix\EHR-System-Appendix-Full-Code.rtf'
)

$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
if ([System.IO.Path]::IsPathRooted($OutputPath)) {
    $resolvedOutputPath = [System.IO.Path]::GetFullPath($OutputPath)
}
else {
    $resolvedOutputPath = [System.IO.Path]::GetFullPath((Join-Path $repoRoot $OutputPath))
}

$backendFiles = @(
    @{
        Label = 'A.1'
        Title = 'Server Entry Point'
        Description = 'Express application bootstrap and route registration.'
        Purpose = 'This file is the main backend entry point. It starts the Express application, initializes the database schema, configures middleware, mounts the API routes, and serves the frontend files.'
        Usage = 'It is executed when the backend server starts. In the implemented system it acts as the integration layer that connects the authentication module, admin module, clinician module, patient module, database configuration, and static frontend delivery.'
        KeyPoints = @(
            'Loads environment variables and starts the HTTP server on the configured port.',
            'Calls initializeDatabase() so the SQLite schema exists before requests are processed.',
            'Registers common middleware such as CORS, JSON parsing, and request logging.',
            'Mounts the auth, admin, clinician, and patient route modules under /api.',
            'Serves the frontend directory and returns index.html for non-API routes.'
        )
        Path = 'backend/server.js'
    },
    @{
        Label = 'A.2'
        Title = 'Database Configuration'
        Description = 'SQLite database initialization and schema creation.'
        Purpose = 'This file defines the persistent data layer for the EHR application by connecting to SQLite and creating all required system tables.'
        Usage = 'It is imported by the server, middleware, seed script, and route handlers. The initializeDatabase() function is used at startup and before seeding to guarantee that the RBAC, user, clinical, appointment, and audit tables exist.'
        KeyPoints = @(
            'Creates the roles, permissions, role_permissions, users, patients, medical_records, appointments, and audit_logs tables.',
            'Uses better-sqlite3 for a lightweight embedded database suitable for a dissertation prototype.',
            'Enables WAL mode to improve concurrent read/write behaviour.',
            'Enables foreign key enforcement to preserve relational integrity across linked tables.'
        )
        Path = 'backend/config/database.js'
    },
    @{
        Label = 'A.3'
        Title = 'Database Seeding Script'
        Description = 'Synthetic data creation for roles, users, appointments, and medical records.'
        Purpose = 'This file populates the database with demonstration data required to test and present the RBAC-based EHR system.'
        Usage = 'It is run during project setup to create the default roles, permissions, demo user accounts, patient profiles, medical records, appointments, and sample audit logs used for dissertation screenshots, evaluation, and system demonstrations.'
        KeyPoints = @(
            'Creates the three role categories: admin, clinician, and patient.',
            'Maps each role to the permissions that enforce the RBAC model.',
            'Hashes the shared demo password using bcrypt before storing users.',
            'Creates synthetic Nigerian-style patient profiles, appointments, and consultation records.',
            'Seeds audit logs so the security and accountability features can be demonstrated immediately.'
        )
        Path = 'backend/config/seed.js'
    },
    @{
        Label = 'A.4'
        Title = 'Authentication and RBAC Middleware'
        Description = 'JWT verification, user resolution, and role-based access control helpers.'
        Purpose = 'This file contains the core security controls that protect backend resources through authentication, authorization, and auditing.'
        Usage = 'It is imported by the route modules. authenticateToken validates bearer tokens, requireRole checks the user role before access is granted, generateToken issues session tokens during login, and logAudit records both successful and denied access attempts.'
        KeyPoints = @(
            'Validates JWT tokens and rejects missing, invalid, or expired credentials.',
            'Loads the authenticated user from the database and attaches the user object to the request.',
            'Enforces role-based access control for protected route groups.',
            'Writes audit trail entries for denied access, invalid tokens, and authenticated actions.',
            'Generates 8-hour JWT session tokens for logged-in users.'
        )
        Path = 'backend/middleware/auth.js'
    },
    @{
        Label = 'A.5'
        Title = 'Authentication Routes'
        Description = 'Login, logout, and current-user endpoints.'
        Purpose = 'This file exposes the authentication endpoints used by the frontend login page and authenticated dashboards.'
        Usage = 'It receives login credentials from the frontend, validates them against stored password hashes, issues JWT tokens for successful sessions, records authentication events in the audit log, and returns identity information used by the dashboards.'
        KeyPoints = @(
            'Processes POST /api/auth/login and verifies user credentials with bcrypt.',
            'Updates the last_login timestamp after a successful login.',
            'Returns the signed JWT token and role information consumed by the frontend.',
            'Provides POST /api/auth/logout for session termination logging.',
            'Provides GET /api/auth/me so the application can retrieve the current user profile and permissions.'
        )
        Path = 'backend/routes/auth.js'
    },
    @{
        Label = 'A.6'
        Title = 'Administrative Routes'
        Description = 'Admin dashboard, user management, audit logs, and records access.'
        Purpose = 'This file implements the administrator-only backend features for governance, monitoring, and system management.'
        Usage = 'It is called by the admin dashboard to load system statistics, manage user accounts, inspect audit logs, review RBAC roles, and view all medical records across the platform.'
        KeyPoints = @(
            'Applies authenticateToken and requireRole("admin") to the whole route group.',
            'Returns dashboard statistics such as user counts, record counts, appointments, and denied-access totals.',
            'Supports user creation, update, and soft deactivation operations.',
            'Allows filtered retrieval of audit logs for accountability review.',
            'Exposes a complete records view so the administrator can inspect system-wide data.'
        )
        Path = 'backend/routes/admin.js'
    },
    @{
        Label = 'A.7'
        Title = 'Clinician Routes'
        Description = 'Patient lookup, records management, and appointment handling for clinicians.'
        Purpose = 'This file implements the clinical workflow endpoints used by authorised healthcare staff.'
        Usage = 'It is called by the clinician dashboard to retrieve assigned work summaries, browse patients, inspect a full patient file, create and update medical records, schedule appointments, and change appointment status.'
        KeyPoints = @(
            'Allows clinicians and admins to access the clinician route group.',
            'Returns dashboard metrics such as patient counts, appointments, and recently attended patients.',
            'Provides detailed patient lookup including profile, records, and appointment history.',
            'Creates new medical records and checks ownership before record updates are allowed.',
            'Schedules appointments and enforces valid appointment status transitions.'
        )
        Path = 'backend/routes/clinician.js'
    },
    @{
        Label = 'A.8'
        Title = 'Patient Routes'
        Description = 'Patient profile, appointments, records, and summary endpoints.'
        Purpose = 'This file provides the self-service backend interface through which patients can safely access only their own data.'
        Usage = 'It is consumed by the patient dashboard to load the current user profile, personal medical records, personal appointments, and a summary view containing recent visits, upcoming appointments, and active medications.'
        KeyPoints = @(
            'Restricts the whole route group to authenticated users with the patient role.',
            'Returns only the current patient’s profile and associated health data.',
            'Prevents cross-patient data exposure by always querying with req.user.id.',
            'Aggregates summary metrics used on the patient home page.'
        )
        Path = 'backend/routes/patient.js'
    },
    @{
        Label = 'A.9'
        Title = 'Backend Package Configuration'
        Description = 'Node.js package metadata and backend runtime dependencies.'
        Purpose = 'This file defines the backend package metadata, startup scripts, and external libraries required to run the application.'
        Usage = 'It is used by npm during installation and execution of the backend. It documents the packages needed for routing, database access, password hashing, JWT handling, logging, and environment configuration.'
        KeyPoints = @(
            'Declares the backend entry point and package identity.',
            'Defines runtime scripts for starting and developing the Node.js server.',
            'Lists the core dependencies that support the RBAC EHR implementation.'
        )
        Path = 'backend/package.json'
    }
)

$frontendFiles = @(
    @{
        Label = 'B.1'
        Title = 'System Login Page'
        Description = 'Initial authentication interface for all user roles.'
        Purpose = 'This file defines the main entry page that users see before accessing the system.'
        Usage = 'It is served as the default frontend page. Users enter their email and password here, the page sends the credentials to /api/auth/login, stores the returned JWT and user object in localStorage, and redirects each user to the correct role-specific dashboard.'
        KeyPoints = @(
            'Contains the login form used by all user categories.',
            'Provides demo-account shortcuts for evaluation and demonstration.',
            'Redirects already authenticated users directly to the dashboard that matches their role.',
            'Displays authentication feedback when login succeeds or fails.'
        )
        Path = 'frontend/index.html'
    },
    @{
        Label = 'B.2'
        Title = 'Access Denied Page'
        Description = 'Frontend error page shown for unauthorized access attempts.'
        Purpose = 'This file presents a user-friendly explanation when an authenticated user tries to open a page outside their authorised role.'
        Usage = 'It is reached when the frontend role guard detects that a user does not have permission to enter a protected page. It supports the RBAC usability layer by explaining the restriction and offering navigation back to an allowed location.'
        KeyPoints = @(
            'Explains that RBAC prevented the requested action.',
            'Shows the current role when user session data is available.',
            'Provides buttons to go back, return to the dashboard, or log out.'
        )
        Path = 'frontend/access-denied.html'
    },
    @{
        Label = 'B.3'
        Title = 'Global Stylesheet'
        Description = 'Shared user interface styling for all frontend pages.'
        Purpose = 'This file defines the shared visual presentation of the entire frontend application.'
        Usage = 'It is imported by the login page, access-denied page, and all dashboards. It ensures consistent typography, colours, spacing, cards, tables, forms, badges, modals, alerts, responsive behaviour, and role-based visual cues throughout the system.'
        KeyPoints = @(
            'Defines reusable CSS variables for colour, spacing, and shadows.',
            'Styles the login layout, dashboard shell, forms, cards, tables, badges, and modals.',
            'Provides responsive behaviour so the pages remain usable on smaller screens.',
            'Applies role-specific accent styling for admin, clinician, and patient views.'
        )
        Path = 'frontend/assets/css/style.css'
    },
    @{
        Label = 'B.4'
        Title = 'Shared Frontend Script'
        Description = 'Common client-side helpers for API access, session state, and rendering support.'
        Purpose = 'This file centralises common frontend logic that is reused across the HTML pages.'
        Usage = 'It is loaded by every frontend page. It handles API communication with the backend, token attachment, authentication checks, logout, toasts, modals, sidebar rendering, formatting utilities, and badge helpers used throughout the dashboards.'
        KeyPoints = @(
            'Wraps fetch requests so authenticated API calls automatically include the JWT token.',
            'Provides session helpers such as getUser(), getToken(), isLoggedIn(), and logout().',
            'Implements requireAuth() to redirect unauthorised users away from protected pages.',
            'Provides reusable UI helpers for toasts, modals, sidebar state, dates, and status badges.'
        )
        Path = 'frontend/assets/js/app.js'
    },
    @{
        Label = 'B.5'
        Title = 'Administrator Dashboard'
        Description = 'Admin frontend for user management, logs, and system monitoring.'
        Purpose = 'This file defines the administrator web interface for system-wide control and monitoring.'
        Usage = 'After admin login, this dashboard consumes the admin API endpoints to display system statistics, recent logins, user management tools, medical records, audit logs, and role-permission summaries.'
        KeyPoints = @(
            'Contains dashboard, user management, all-records, audit-log, and roles-permissions sections.',
            'Loads data dynamically from the protected admin endpoints.',
            'Provides modal-driven user creation and editing actions.',
            'Supports user deactivation and audit-log filtering within the same page.'
        )
        Path = 'frontend/pages/admin/dashboard.html'
    },
    @{
        Label = 'B.6'
        Title = 'Clinician Dashboard'
        Description = 'Clinician frontend for records, patients, and appointments.'
        Purpose = 'This file defines the clinician-facing user interface for day-to-day healthcare operations.'
        Usage = 'After clinician login, the page loads clinician dashboard statistics, patient registry data, individual patient detail views, record creation forms, and appointment scheduling tools by calling the clinician API endpoints.'
        KeyPoints = @(
            'Displays a clinician dashboard with workload and activity summaries.',
            'Shows a searchable patient registry and full patient-detail view.',
            'Allows creation of new medical records through a modal form.',
            'Allows appointment scheduling and appointment status updates.'
        )
        Path = 'frontend/pages/clinician/dashboard.html'
    },
    @{
        Label = 'B.7'
        Title = 'Patient Dashboard'
        Description = 'Patient frontend for profile, records, appointments, and health summary.'
        Purpose = 'This file defines the patient portal through which patients can review their own information securely.'
        Usage = 'After patient login, the page loads the patient summary, personal profile, personal medical records, and personal appointments using the patient-only backend endpoints. It is designed to demonstrate privacy-preserving self-service access under the RBAC model.'
        KeyPoints = @(
            'Provides a home summary with recent visit and upcoming appointment information.',
            'Displays personal demographic and emergency-contact details.',
            'Shows the patient’s medical history and medication information.',
            'Allows filtering of appointments by status inside the portal.'
        )
        Path = 'frontend/pages/patient/dashboard.html'
    }
)

$sections = @(
    @{
        Heading = 'Appendix A: Backend Source Code'
        Intro = 'This section contains the full backend source code listings for the Node.js, Express, SQLite, and RBAC implementation.'
        Items = $backendFiles
    },
    @{
        Heading = 'Appendix B: Frontend Source Code'
        Intro = 'This section contains the full frontend source code listings for the HTML, CSS, and JavaScript user interfaces.'
        Items = $frontendFiles
    }
)

function ConvertTo-RtfText {
    param(
        [string]$Text
    )

    if ($null -eq $Text) {
        return ''
    }

    $builder = New-Object System.Text.StringBuilder

    foreach ($char in $Text.ToCharArray()) {
        switch ($char) {
            '\' { [void]$builder.Append('\\') }
            '{' { [void]$builder.Append('\{') }
            '}' { [void]$builder.Append('\}') }
            "`t" { [void]$builder.Append('\tab ') }
            "`r" { }
            "`n" { [void]$builder.Append('\line ') }
            default {
                $codePoint = [int][char]$char
                if ($codePoint -le 127) {
                    [void]$builder.Append($char)
                }
                else {
                    [void]$builder.Append("\u$codePoint?")
                }
            }
        }
    }

    return $builder.ToString()
}

function Add-Paragraph {
    param(
        [System.Text.StringBuilder]$Builder,
        [string]$Text,
        [string]$Format = '\pard\f0\fs22\sa120',
        [switch]$BlankLine
    )

    if ($BlankLine) {
        [void]$Builder.AppendLine('\pard\sa120\par')
        return
    }

    [void]$Builder.AppendLine("$Format $(ConvertTo-RtfText $Text)\par")
}

function Add-ItemizedParagraphs {
    param(
        [System.Text.StringBuilder]$Builder,
        [string[]]$Items,
        [string]$Prefix = '- '
    )

    foreach ($item in $Items) {
        Add-Paragraph -Builder $Builder -Text ("$Prefix$item") -Format '\pard\f0\fs19\li360\sa70'
    }
}

function Add-NumberedCode {
    param(
        [string]$Text
    )

    $normalized = $Text -replace "`r`n", "`n" -replace "`r", "`n"
    $lines = $normalized -split "`n"
    $width = [Math]::Max(3, $lines.Count.ToString().Length)
    $numberedLines = New-Object System.Collections.Generic.List[string]

    for ($index = 0; $index -lt $lines.Count; $index++) {
        $lineNumber = ($index + 1).ToString().PadLeft($width)
        $numberedLines.Add("$lineNumber  $($lines[$index])")
    }

    return [string]::Join("`n", $numberedLines)
}

foreach ($section in $sections) {
    foreach ($item in $section.Items) {
        $fullPath = Join-Path $repoRoot $item.Path
        if (-not (Test-Path -LiteralPath $fullPath)) {
            throw "Missing source file: $($item.Path)"
        }
    }
}

$builder = New-Object System.Text.StringBuilder

[void]$builder.AppendLine('{\rtf1\ansi\deff0')
[void]$builder.AppendLine('{\fonttbl{\f0 Times New Roman;}{\f1 Consolas;}}')
[void]$builder.AppendLine('{\colortbl ;\red235\green235\blue235;}')
[void]$builder.AppendLine('\paperw12240\paperh15840\margl1440\margr1440\margt1440\margb1440')
[void]$builder.AppendLine('\viewkind4\uc1')

Add-Paragraph -Builder $builder -Text 'Appendix: Full Source Code Listing' -Format '\pard\qc\b\f0\fs32\sa240'
Add-Paragraph -Builder $builder -Text 'Secure Cloud-Based Electronic Health Record System with Role-Based Access Control' -Format '\pard\qc\f0\fs24\sa160'
Add-Paragraph -Builder $builder -Text 'Prepared as a dissertation appendix document for Microsoft Word.' -Format '\pard\qc\f0\fs22\sa120'
Add-Paragraph -Builder $builder -Text ("Generated on {0}" -f (Get-Date -Format 'dd MMMM yyyy')) -Format '\pard\qc\f0\fs20\sa120'
Add-Paragraph -Builder $builder -BlankLine
Add-Paragraph -Builder $builder -Text 'Included source code scope:' -Format '\pard\b\f0\fs22\sa180'
Add-Paragraph -Builder $builder -Text 'Backend: server setup, database configuration, seed script, middleware, routes, and package configuration.' -Format '\pard\f0\fs20\sa100'
Add-Paragraph -Builder $builder -Text 'Frontend: login page, access page, stylesheet, shared JavaScript, and role-specific dashboards.' -Format '\pard\f0\fs20\sa100'
Add-Paragraph -Builder $builder -Text 'Excluded items: node_modules, SQLite database binaries, and package-lock.json because they are generated or third-party dependency artifacts.' -Format '\pard\f0\fs20\sa100'
Add-Paragraph -Builder $builder -BlankLine
Add-Paragraph -Builder $builder -Text 'How the implemented system works:' -Format '\pard\b\f0\fs22\sa180'
Add-ItemizedParagraphs -Builder $builder -Items @(
    'A user opens the login page, enters credentials, and the frontend submits the request to the authentication API.',
    'The backend verifies the credentials, creates a JWT session token, and returns the user role together with identity details.',
    'The frontend stores the token locally and redirects the user to the correct dashboard for admin, clinician, or patient access.',
    'Each dashboard calls only the API routes relevant to that role, while the backend middleware validates tokens and checks roles before responding.',
    'All major access decisions are written to the audit log, and all operational data is stored in the SQLite database.'
)
Add-Paragraph -Builder $builder -BlankLine
Add-Paragraph -Builder $builder -Text 'How this appendix is organised:' -Format '\pard\b\f0\fs22\sa180'
Add-ItemizedParagraphs -Builder $builder -Items @(
    'Each appendix section begins with a short description of the file’s purpose in the system.',
    'A second note explains how that file is used during system execution or user interaction.',
    'A short responsibility list summarises the main features implemented in that file.',
    'The complete file contents are then reproduced in full with line numbers for dissertation reference.'
)

[void]$builder.AppendLine('\page')
Add-Paragraph -Builder $builder -Text 'Appendix Structure' -Format '\pard\b\f0\fs28\sa220'
foreach ($section in $sections) {
    Add-Paragraph -Builder $builder -Text $section.Heading -Format '\pard\b\f0\fs22\sa160'
    foreach ($item in $section.Items) {
        Add-Paragraph -Builder $builder -Text ("{0}  {1}  ({2})" -f $item.Label, $item.Title, $item.Path) -Format '\pard\f0\fs20\sa80'
    }
}

foreach ($section in $sections) {
    [void]$builder.AppendLine('\page')
    Add-Paragraph -Builder $builder -Text $section.Heading -Format '\pard\b\f0\fs30\sa240'
    Add-Paragraph -Builder $builder -Text $section.Intro -Format '\pard\f0\fs21\sa140'

    foreach ($item in $section.Items) {
        $sourcePath = Join-Path $repoRoot $item.Path
        $rawContent = Get-Content -LiteralPath $sourcePath -Raw
        $numberedCode = Add-NumberedCode -Text $rawContent

        [void]$builder.AppendLine('\page')
        Add-Paragraph -Builder $builder -Text ("Appendix {0}: {1}" -f $item.Label, $item.Title) -Format '\pard\b\f0\fs25\sa220'
        Add-Paragraph -Builder $builder -Text ("File Path: {0}" -f $item.Path) -Format '\pard\i\f0\fs20\sa100'
        Add-Paragraph -Builder $builder -Text ("Section Description: {0}" -f $item.Description) -Format '\pard\i\f0\fs20\sa100'
        Add-Paragraph -Builder $builder -Text ("What this file does: {0}" -f $item.Purpose) -Format '\pard\f0\fs20\sa100'
        Add-Paragraph -Builder $builder -Text ("How this file is used in the system: {0}" -f $item.Usage) -Format '\pard\f0\fs20\sa100'
        Add-Paragraph -Builder $builder -Text 'Main responsibilities implemented in this file:' -Format '\pard\b\f0\fs20\sa120'
        Add-ItemizedParagraphs -Builder $builder -Items $item.KeyPoints
        Add-Paragraph -Builder $builder -BlankLine
        Add-Paragraph -Builder $builder -Text 'Full source code listing:' -Format '\pard\b\f0\fs20\sa120'
        [void]$builder.AppendLine('\pard\li240\ri120\cb1\f1\fs18\sa80')
        [void]$builder.AppendLine("$(ConvertTo-RtfText $numberedCode)\par")
        [void]$builder.AppendLine('\pard\cb0\par')
    }
}

[void]$builder.AppendLine('}')

$outputDirectory = Split-Path -Path $resolvedOutputPath -Parent
if (-not (Test-Path -LiteralPath $outputDirectory)) {
    New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
}

Set-Content -LiteralPath $resolvedOutputPath -Value $builder.ToString() -Encoding UTF8
Write-Output "Appendix document created at: $resolvedOutputPath"
