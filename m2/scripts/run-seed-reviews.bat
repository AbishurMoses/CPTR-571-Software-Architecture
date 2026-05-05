@echo off
echo ================================
echo  Epic Games Review Auto-Seeder
echo  Press Ctrl+C to stop anytime
echo ================================
echo.

:loop

:: Run the review seeder
node seed-reviews.mjs

:: Check if fully complete
if %errorlevel% == 0 (
    if not exist review-progress.json (
        echo.
        echo ================================
        echo  All reviews seeded! Done!
        echo ================================
        pause
        exit /b 0
    )
)

:: Wait 1 second before next run
echo Waiting 1 second before next run...
timeout /t 1 /nobreak > nul
echo.
goto loop
