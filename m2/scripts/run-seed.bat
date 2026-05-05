@echo off
echo ================================
echo  Epic Games Auto-Seeder
echo  Press Ctrl+C to stop anytime
echo ================================
echo.

:loop

:: Run the seeder
node seed-epic-browser.mjs

:: Check if fully complete (exit code 0 means success)
if %errorlevel% == 0 (
    :: Check if progress file is gone — means we're done
    if not exist seed-progress.json (
        echo.
        echo ================================
        echo  All games seeded! Done!
        echo ================================
        pause
        exit /b 0
    )
)

:: Wait 1 second before next run to let things settle
echo Waiting 1 second before next run...
timeout /t 1 /nobreak > nul
echo.
goto loop
