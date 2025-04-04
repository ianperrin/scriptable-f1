// Variables used by Scriptable.
// icon-color: red; icon-glyph: flag-checkered;
// Acknowledgements:
// F1 race data from the great project jolpica-f1, which took over where ergast left off. https://github.com/jolpica/jolpica-f1
// Nodman for adding caching and ability to update the script. https://github.com/Nodman
// ianperrin for widget parameters. https://github.com/ianperrin

// --------------------------------------------------
// Constants & Setup - DO NOT EDIT
// --------------------------------------------------
const SCRIPT_VERSION = "4.5";
const DATA_URL = "https://api.jolpi.ca/ergast/f1/current/next.json";
const RACE_IDX = 0;
const now = new Date();
const UPDATE_URL = "https://raw.githubusercontent.com/timespacedecay/scriptable/refs/heads/main/Next%20F1%20Race%20Schedule.js";

// Paths and file manager
const scriptPath = module.filename;
const fm = FileManager.local();
// If you want to store the script in iCloud, you can do:
// if (fm.isFileStoredIniCloud(scriptPath)) fm = FileManager.iCloud();

// Get widget parameters - set your parameters in the "Parameters" field when adding widget to home screen (or tap and hold widget > edit widget).
// Parameters must be in this order/format "locale|AMPM(AMPM/or blank)|refreshInterval(in minutes)|widgetWidth|paddingLeft|paddingRight|spaceBetweenRows|spaceBetweenColumns|raceTitleFontSize|sessionTitleFontSize|sessionFontSize"
// Defaults will be used if no parameters set, or a parameter value is missing.
// Examples:
//    UK date format: en-UK
//    US date format but AM/PM time: |AMPM
//    Refresh data every 12 hours instead of every hour (will still fade past sessions, this just sets the interval to check the API for schedule info): ||720
const prms = (args.widgetParameter || "").split("|");
const familyPrms = {
    accessoryRectangular: "en-US||60|170|-4|-4|2|0|10|9|9",
    small: "en-US||60|170|-4|-4|10|0|12|10|10",
    medium: "en-US||60|350|-5|-5|7.5|0|22|18|18",
    large: "en-US||60|350|-5|-5|7.5|0|22|18|18"
}
const family = config.widgetFamily || "accessoryRectangular"
const defaultPrms = familyPrms[family].split("|")
// Widget layout options
function getOptions() {
    return {
        width: parseInt(prms[3] || defaultPrms[3]),
        font: {
            header: ["HiraginoSans-W7", parseInt(prms[8] || defaultPrms[8])],
            title: ["HiraginoSans-W6", parseInt(prms[9] || defaultPrms[9])],
            body: ["HiraginoSans-W4", parseInt(prms[10] || defaultPrms[10])]
        },
        padding: {
            left: parseInt(prms[4] || defaultPrms[4]),
            right: parseInt(prms[5] || defaultPrms[5])
        },
        spaceBetweenRows: parseInt(prms[6] || defaultPrms[6]),
        spaceBetweenColumns: parseInt(prms[7] || defaultPrms[7]),
        //date and time format
        locale: parseInt(prms[0] || defaultPrms[0]),
        timeAMPM: (prms[1] || defaultPrms[1]) == "AMPM",
        //adjustable refresh time (less than 60 is ignored)
        refreshLimitInMinutes: parseInt(prms[2] || defaultPrms[2])
    };
}
// --------------------------------------------------
// 2) Build the widget
// --------------------------------------------------
const widget = await createWidget();

// --------------------------------------------------
// Show menu so user can choose what to do
// --------------------------------------------------
if (config.runsInApp) {
    const menu = new Alert();
    menu.title = "F1 Race Schedule";
    menu.message = "Choose an action:";
    menu.addAction("Preview Lock Screen");
    menu.addAction("Preview HS Small");
    menu.addAction("Preview HS Medium");
    menu.addAction("Preview HS Large");
    menu.addAction("Update Script");
    menu.addCancelAction("Cancel");

    const selection = await menu.presentAlert();
    let previewWidget;
    switch (selection) {
        case 0: // Preview lock screen
            widgetsize.lock = true
            previewWidget = await createWidget();
            await previewWidget.presentAccessoryRectangular();
            break;
        case 1: // Preview home screen small
            previewWidget = await createWidget();
            await previewWidget.presentSmall();
            break;
        case 2: // Preview home screen medium
            previewWidget = await createWidget();
            await previewWidget.presentMedium();
            break;
        case 3: // Preview home screen large
            previewWidget = await createWidget();
            await previewWidget.presentLarge();
            break;
        case 4: // Update script code
            await updateScript();
            break;
        default:
            // Cancel
            break;
    }
    // If you didn't choose "Set Widget & Exit", let's just end:
    Script.complete();
} else { // Set as the widget
    const widget = await createWidget();
    Script.setWidget(widget);
    Script.complete();
}

/** 
 * Creates the main F1 schedule widget.
 */
async function createWidget() {
    const w = new ListWidget();
    const data = await getData(); // uses caching + headers
    const race = data.MRData.RaceTable.Races[RACE_IDX];
    const raceDateTime = new Date(`${race.date}T${race.time}`);
    const fp1 = race.FirstPractice;
    const fp1DateTime = new Date(`${fp1.date}T${fp1.time}`);
    const quali = race.Qualifying;
    const qualiDateTime = new Date(`${quali.date}T${quali.time}`);
    const options = getOptions()

    let sprintOrSP, isSprint = Object.hasOwn(race, "Sprint");

    let dateTime = [];
    dateTime[0] = {
        title: "FP1",
        day: await formatSessionDay(fp1DateTime),
        date: await formatSessionDate(fp1DateTime),
        time: await formatSessionTime(fp1DateTime),
        raw: fp1DateTime
    };

    sprintOrSP = isSprint ? race.SprintQualifying : race.SecondPractice;
    const fp2sprintQDateTime = new Date(`${sprintOrSP.date}T${sprintOrSP.time}`);
    dateTime[1] = {
        title: isSprint ? "SQ" : "FP2",
        day: await formatSessionDay(fp2sprintQDateTime),
        date: await formatSessionDate(fp2sprintQDateTime),
        time: await formatSessionTime(fp2sprintQDateTime),
        raw: fp2sprintQDateTime
    };

    sprintOrSP = isSprint ? race.Sprint : race.ThirdPractice;
    const fp3sprintDateTime = new Date(`${sprintOrSP.date}T${sprintOrSP.time}`);
    dateTime[2] = {
        title: isSprint ? "SPR" : "FP3",
        day: await formatSessionDay(fp3sprintDateTime),
        date: await formatSessionDate(fp3sprintDateTime),
        time: await formatSessionTime(fp3sprintDateTime),
        raw: fp3sprintDateTime
    };

    dateTime[3] = {
        title: "Quali",
        day: await formatSessionDay(qualiDateTime),
        date: await formatSessionDate(qualiDateTime),
        time: await formatSessionTime(qualiDateTime),
        raw: qualiDateTime
    };

    dateTime[4] = {
        title: "Race",
        day: await formatSessionDay(raceDateTime),
        date: await formatSessionDate(raceDateTime),
        time: await formatSessionTime(raceDateTime),
        raw: raceDateTime
    };

    // HEADER
    const headerStack = w.addStack();
    const headerText = race.raceName.toUpperCase();
    const headerCell = headerStack.addStack();
    headerCell.size = new Size(options.width, 0);
    headerCell.addSpacer();

    const textElement = headerCell.addText(headerText);
    textElement.font = new Font(...options.font.header);
    textElement.minimumScaleFactor = 0.5;
    textElement.lineLimit = 1;

    headerCell.addSpacer();
    w.addSpacer(options.spaceBetweenRows);

    // BODY
    let body = w.addStack();
    body.size = new Size(options.width, 0);

    for (let column = 0; column < dateTime.length; column++) {
        let currentColumn = body.addStack();
        currentColumn.layoutVertically();
        currentColumn.setPadding(0, options.padding.left, 0, options.padding.right);

        for (let row in dateTime[column]) {
            if (row === "raw") continue;
            let currentCell = currentColumn.addStack();
            currentCell.addSpacer();

            let cellText = currentCell.addText(dateTime[column][row]);
            cellText.font = (row === "title")
                ? new Font(...options.font.title)
                : new Font(...options.font.body);

            // Gray out past sessions
            cellText.textOpacity = finished(dateTime[column].raw);
            cellText.lineLimit = 1;
            cellText.minimumScaleFactor = 0.5;

            currentCell.addSpacer();
            currentColumn.addSpacer(options.spaceBetweenRows);
        }
        currentColumn.addSpacer(options.spaceBetweenColumns);
    }

    return w;
}

/**
 * Lower opacity for past times, full for future times.
 */
function finished(time) {
    return time < now ? 0.5 : 1;
}

function readFromCache(cachePath) {
    const cached = JSON.parse(fm.readString(cachePath));

    return cached;
}

/**
 * Returns data from cache if <1hr old, otherwise fetch with custom headers.
 */
async function getData() {
    const nowMs = Date.now();
    const timeMultiplier = 60 * 1000;
    const cachePath = fm.joinPath(fm.cacheDirectory(), "f1DataCache.json");
    const cacheExists = fm.fileExists(cachePath);
    const options = getOptions()

    const refreshLimit = options.refreshLimitInMinutes < 60 ? 60 * timeMultiplier : options.refreshLimitInMinutes * timeMultiplier
    // Try reading from cache
    if (cacheExists) {
        try {
            const cached = readFromCache(cachePath)
            const ageMs = nowMs - cached.timestamp;

            if (ageMs < refreshLimit) { // 1 hour or more
                console.log("Using cached data");

                return cached.data;
            } else {
                console.log("Cache too old, need fresh data");
            }
        } catch (e) {
            console.log("Error reading cache, will fetch fresh data.");
        }
    }

    // Otherwise, fetch fresh data
    try {
        const req = new Request(DATA_URL);

        req.headers = {
            "User-Agent": `Scriptable: NextF1RaceSchedule/${SCRIPT_VERSION}`
        };

        const data = await req.loadJSON();

        // Cache it
        fm.writeString(
            cachePath,
            JSON.stringify({
                timestamp: nowMs,
                data
            })
        );

        console.log("Fetched fresh data from API");

        return data;
    } catch (error) {
        // if we can't fetch data (API error, ot network is down), fallback to cache
        console.log("Unable to fetch data, will try reading from cache.");

        try {
            if (!cacheExists) {
                throw new Error("No cached data available");
            }

            const cached = readFromCache(cachePath)

            console.log("Using cached data");

            return cached.data
        } catch (error) {
            console.error("Unable to fetch data or read from cache: ", error);
        }
    }
}

/**
 * Format day (e.g. "Mon")
 */
async function formatSessionDay(sessionDay) {
    return sessionDay.toLocaleDateString(getOptions().locale, { weekday: "short" });
}

/**
 * Format date (e.g. "4/15")
 */
async function formatSessionDate(sessionDate) {
    return sessionDate.toLocaleDateString(getOptions().locale, { month: "numeric", day: "numeric" });
}

/**
 * Format time (e.g. "14:00")
 */
async function formatSessionTime(sessionTime) {
    return sessionTime.toLocaleTimeString(getOptions().locale, { hour12: getOptions().timeAMPM, hour: "numeric", minute: "numeric" });
}

/**
 * ---------------------------------------------------------------
 * "Update Code" - Overwrite the current script with the one
 * hosted at UPDATE_URL.
 * ---------------------------------------------------------------
 */
async function updateScript() {
    const alert = new Alert();
    const scriptName = scriptPath.split("/").pop();

    alert.title = `Update "${scriptName}" code?`;
    alert.message = "This will overwrite your local changes!";
    alert.addCancelAction("No");
    alert.addDestructiveAction("Yes, overwrite");
    const choice = await alert.present();

    if (choice === -1) {
        // User tapped "No"
        return;
    }

    let updateMessage;
    try {
        const req = new Request(UPDATE_URL);
        const newCode = await req.loadString();
        fm.writeString(scriptPath, newCode);
        updateMessage = "Code updated. Close & reopen the script to see changes.";
    } catch (error) {
        updateMessage = `Update failed. ${error}`;
    }

    const resultAlert = new Alert();
    resultAlert.title = "Update code";
    resultAlert.message = updateMessage;
    resultAlert.addCancelAction("OK");
    await resultAlert.present();
}
