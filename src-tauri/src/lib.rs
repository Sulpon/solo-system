// Atlas is a real Next.js application (Route Handlers, a Supabase auth
// proxy/middleware, cookie-based session refresh - see the repo audit in
// this milestone's report) - it is NOT statically exported. This shell
// therefore always points its window at a real, running Next.js server
// rather than Tauri's bundled static-asset protocol:
//
// - In development, `tauri.conf.json`'s `beforeDevCommand`/`devUrl` already
//   run `npm run dev` and wait for it to be reachable before this binary
//   even starts, so `setup()` just needs to open a window at that URL.
// - In a release build, there is no separately-running dev server, so this
//   file spawns the bundled Next.js "standalone" server (see
//   `npm run build:desktop`) as a child process first, waits for it to
//   start accepting connections, then opens the window - and kills that
//   child process again when Atlas exits, so no orphaned server survives a
//   closed window.
//
// Milestone 3 adds a system tray, a global shortcut, and window position/
// size persistence on top of that unchanged foundation. All of it lives
// here (or in the small plugins registered below) rather than in the
// frontend - see app/(app)/_lib/desktop/ for the JS-side half of this
// boundary (still just "show/hide the existing focus-companion window,"
// never a second window or a second way to create one).
mod os_launcher;
mod widgets;

use tauri::menu::{IsMenuItem, Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::tray::TrayIconBuilder;
use tauri::{
    AppHandle, LogicalPosition, Manager, Monitor, Position, WebviewUrl, WebviewWindow,
    WebviewWindowBuilder, WindowEvent,
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

#[cfg(not(debug_assertions))]
use std::process::Child;
#[cfg(not(debug_assertions))]
use std::sync::Mutex;
use tauri::RunEvent;

#[cfg(not(debug_assertions))]
const APP_PORT: u16 = 3000;
#[cfg(debug_assertions)]
const DEV_URL: &str = "http://localhost:3000";

#[cfg(not(debug_assertions))]
struct ServerProcess(Mutex<Option<Child>>);

// The base URL the running Next.js server is reachable at - resolved once in
// setup() (differs between `next dev` in debug builds and the bundled
// standalone server in release builds) and stashed in managed state so the
// tray/global-shortcut paths (which have no JS execution context to ask the
// main window to compute this) can build the Focus Companion's URL the same
// way create_main_window built the main window's.
pub(crate) struct AppBaseUrl(pub(crate) String);

const FOCUS_COMPANION_LABEL: &str = "focus-companion";
// Must stay numerically identical to FOCUS_COMPANION_WIDTH/HEIGHT/MIN_*/
// SCREEN_MARGIN_* in app/(app)/_lib/desktop/focus-companion-window.ts. Two
// independent "create the Companion" implementations exist because JS needs
// its own (QuestExecutionControl's buttons run in the main window's webview)
// and Rust needs its own (the tray and the global shortcut have no webview
// to call into) - both always find/reuse the SAME native window by the same
// "focus-companion" label, so this is a constants duplication, not a second
// window or a second piece of state.
const FOCUS_COMPANION_WIDTH: f64 = 320.0;
const FOCUS_COMPANION_HEIGHT: f64 = 440.0;
const FOCUS_COMPANION_MIN_WIDTH: f64 = 280.0;
const FOCUS_COMPANION_MIN_HEIGHT: f64 = 340.0;
const SCREEN_MARGIN_RIGHT: f64 = 24.0;
const SCREEN_MARGIN_BOTTOM: f64 = 60.0;
// The minimum on-screen overlap (in physical pixels) a restored window must
// have with some monitor before it's considered "visible enough" - matches
// roughly the Companion's own drag-region header height, so if a window
// clears this bar the user can always still grab it and pull it fully
// on-screen themselves.
const MIN_VISIBLE_OVERLAP_PX: i32 = 40;

// TEMPORARY diagnostic instrumentation - investigating a reported startup
// difference between launching the release exe via Explorer double-click
// (stuck on "Loading...") vs. from an already-`cd`'d PowerShell prompt
// (works). Deliberately writes to a plain file instead of eprintln!/
// println!: every existing diagnostic print in this file is already gated
// behind #[cfg(debug_assertions)] (so a release build - exactly what's
// being compared here - emits NONE of them today), and even an ungated
// print is not a reliable signal for a GUI-subsystem exe launched without a
// console (Explorer) vs. one launched from an interactive shell that DOES
// have a console (PowerShell) - the two cases can differ in whether stdout/
// stderr even has anywhere to go, which would make eprintln! itself part of
// the variable being tested rather than a neutral observer. A file in
// %TEMP% (not resource_dir/current_dir - this must not depend on anything
// this investigation is trying to verify) sidesteps that entirely and is
// identical to compare across both launches. Safe to leave in a real
// release build: every write is best-effort (errors silently ignored), and
// the file only ever appends a handful of short lines at startup.
#[cfg(not(debug_assertions))]
fn log_diag(message: &str) {
    use std::io::Write;

    let log_path = std::env::temp_dir().join("atlas-startup-diagnostic.log");
    if let Ok(mut file) = std::fs::OpenOptions::new().create(true).append(true).open(&log_path) {
        let now = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_millis()).unwrap_or(0);
        let _ = writeln!(file, "[{now}] {message}");
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Built once up front (not inside setup()) so the exact same Shortcut
    // value can be registered in setup() AND compared against in the
    // plugin's handler below - see Shortcut's PartialEq derive, which is
    // what lets the handler tell "was THIS our Ctrl+Shift+A" apart from any
    // other shortcut a future milestone might register.
    let companion_shortcut = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyA);
    let companion_shortcut_for_handler = companion_shortcut;

    let builder = tauri::Builder::default()
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, shortcut, event| {
                    if event.state() == ShortcutState::Pressed && *shortcut == companion_shortcut_for_handler {
                        toggle_focus_companion_window(app);
                    }
                })
                .build(),
        )
        // Fully automatic once registered: restores each window's saved
        // position/size on creation (main and focus-companion alike,
        // whichever side created them) and persists changes as the user
        // moves/resizes, writing to disk on RunEvent::Exit. See
        // ensure_window_within_visible_bounds below for the "saved position
        // is no longer on any monitor" safety net this alone doesn't cover.
        .plugin(
            tauri_plugin_window_state::Builder::new()
                .with_state_flags(tauri_plugin_window_state::StateFlags::POSITION | tauri_plugin_window_state::StateFlags::SIZE)
                .build(),
        )
        // A small local plugin (not a published crate - just the same
        // Builder/on_window_ready mechanism tauri-plugin-window-state itself
        // uses above) so ensure_window_within_visible_bounds runs for EVERY
        // window creation regardless of which side created it: Rust
        // (create_main_window/create_focus_companion_window) or JS
        // (app/(app)/_lib/desktop/focus-companion-window.ts's
        // showFocusCompanionWindow, the far more common Companion path via
        // TAKE QUEST). Registered after window-state so its restore always
        // runs first and this only ever corrects an already-restored
        // position, never races it. This only covers window CREATION -
        // see show_focus_companion_window/toggle_focus_companion_window for
        // the same check on the "already exists, just re-showing it" path.
        .plugin(
            // Explicit <Wry, ()> because this is tauri's own generic
            // plugin::Builder<R, C = ()> (unlike the third-party plugin
            // Builders above, which hardcode their own config type
            // internally) - Wry is the same runtime tauri::Builder::default()
            // itself defaults to (and the same one every bare `AppHandle`/
            // `WebviewWindow` in this file already resolves to), and () is
            // the right config type since this plugin takes no
            // tauri.conf.json configuration of its own.
            tauri::plugin::Builder::<tauri::Wry, ()>::new("atlas-window-bounds")
                .on_window_ready(|window| {
                    if let Some(webview_window) = window.app_handle().get_webview_window(window.label()) {
                        ensure_window_within_visible_bounds(&webview_window);
                    }
                })
                .build(),
        )
        // Registered with defaults: OFF until the user opts in from
        // Settings (see app/(app)/_lib/desktop/autostart.ts) and no extra
        // launch arguments - an autostart-triggered launch behaves exactly
        // like a normal one.
        .plugin(tauri_plugin_autostart::Builder::new().build())
        // Phase 19 - Atlas OS v1's ONLY frontend-invokable command so far
        // (see os_launcher.rs). Every other native capability so far (tray,
        // global shortcut, window-state) has no JS-callable command because
        // nothing on the JS side ever needed to trigger it directly; this is
        // the first one, and the ACL entry it needs lives in
        // capabilities/default.json ("allow-launch-application").
        .invoke_handler(tauri::generate_handler![os_launcher::launch_application]);

    #[cfg(not(debug_assertions))]
    let builder = builder.manage(ServerProcess(Mutex::new(None)));

    let app = builder
        .setup(move |app| {
            let handle = app.handle().clone();

            // TEMPORARY diagnostic instrumentation (see log_diag's own
            // comment) - captured as the very first thing in setup(), before
            // anything else has a chance to change process state, so these
            // reflect the launch environment exactly as the OS handed it to
            // this process.
            #[cfg(not(debug_assertions))]
            {
                log_diag("=== Atlas startup ===");
                log_diag(&format!("current_exe(): {:?}", std::env::current_exe()));
                log_diag(&format!("current_dir(): {:?}", std::env::current_dir()));
                log_diag(&format!("resource_dir(): {:?}", app.path().resource_dir()));
                log_diag(&format!("PATH: {}", std::env::var("PATH").unwrap_or_else(|_| "<unset>".to_string())));
                log_diag(&format!("ANTHROPIC_API_KEY set: {}", std::env::var("ANTHROPIC_API_KEY").is_ok()));
                log_diag(&format!(
                    "args: {:?}",
                    std::env::args().collect::<Vec<_>>()
                ));
            }

            // The tray and global shortcut don't depend on the main window
            // existing yet - registering them up front means they're live
            // immediately, even while the release build's server is still
            // starting up in the background below, rather than being
            // delayed by however long that takes.
            if let Err(error) = app.global_shortcut().register(companion_shortcut) {
                #[cfg(debug_assertions)]
                eprintln!(
                    "[Atlas] Could not register the global shortcut Ctrl+Shift+A ({error}). \
                     Another application likely already owns it - the Companion can still be \
                     shown/hidden from the tray or its own window."
                );
                let _ = error;
            }

            build_tray(&handle)?;

            #[cfg(debug_assertions)]
            {
                app.manage(AppBaseUrl(DEV_URL.to_string()));
                let main_window = create_main_window(&handle)?;
                wire_close_to_hide(&main_window);
            }

            // Milestone 5 - spawning the bundled Node server AND polling for
            // it to become reachable are both BLOCKING operations
            // (Command::spawn, then up to a 15s connect-retry loop). Live
            // testing (see the desktop startup diagnosis/fix report) proved
            // running them synchronously inside THIS closure starves
            // whatever else Tauri's own async runtime needs to do during
            // startup: a plain, non-Tauri Rust binary spawning the exact
            // same bundled node.exe took 5ms, while the identical call made
            // from inside setup() took several MINUTES (or hung
            // indefinitely on a more constrained machine) before a window
            // ever appeared - exactly the "does not visibly open" bug this
            // milestone set out to fix, and a separate root cause from the
            // PATH-dependent `Command::new("node")` this milestone also
            // fixed (see spawn_atlas_server). Moving the whole sequence to
            // a dedicated OS thread, and creating the window only once the
            // server is ready (or the wait gives up) via run_on_main_thread
            // - window creation must happen on the main thread - fixes this
            // without touching spawn_atlas_server's/wait_for_server's own
            // logic at all.
            #[cfg(not(debug_assertions))]
            {
                let handle_for_server = handle.clone();
                std::thread::spawn(move || {
                    log_diag("server thread: starting");
                    let outcome = (|| -> tauri::Result<String> {
                        let child = spawn_atlas_server(&handle_for_server)?;
                        log_diag(&format!("spawn_atlas_server: ok, child pid={}", child.id()));
                        handle_for_server.state::<ServerProcess>().0.lock().unwrap().replace(child);
                        let wait_started = std::time::Instant::now();
                        let reachable = wait_for_server(APP_PORT);
                        log_diag(&format!(
                            "wait_for_server: reachable={reachable} elapsed={:?}",
                            wait_started.elapsed()
                        ));
                        Ok(format!("http://127.0.0.1:{APP_PORT}"))
                    })();

                    if let Err(ref error) = outcome {
                        log_diag(&format!("spawn_atlas_server: FAILED: {error}"));
                    }

                    let handle_for_main = handle_for_server.clone();
                    let _ = handle_for_server.run_on_main_thread(move || {
                        let base_url = outcome.unwrap_or_else(|error| {
                            #[cfg(debug_assertions)]
                            eprintln!("[Atlas] Failed to start the bundled server: {error}");
                            let _ = error;
                            // Still opens a window pointed at the expected
                            // URL even on failure - WebView2's own
                            // connection-error page is a real, VISIBLE
                            // signal something is wrong, which is strictly
                            // better than the app staying invisible and
                            // unresponsive forever (the original bug).
                            format!("http://127.0.0.1:{APP_PORT}")
                        });
                        log_diag(&format!("creating main window at base_url={base_url}"));
                        handle_for_main.manage(AppBaseUrl(base_url));
                        match create_main_window(&handle_for_main) {
                            Ok(main_window) => {
                                log_diag("create_main_window: ok");
                                wire_close_to_hide(&main_window);
                            }
                            Err(error) => {
                                log_diag(&format!("create_main_window: FAILED: {error}"));
                            }
                        }
                    });
                });
            }

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building Atlas");

    app.run(|app_handle, event| {
        // The natural "last window closed" path no longer really happens
        // (both windows hide instead of closing - see above and Milestone
        // 2), so in practice this now only fires via the tray's explicit
        // Quit, which calls AppHandle::exit and triggers this same
        // ExitRequested event. Kept as-is (rather than folded into
        // quit_app) so any other path that might still reach a natural
        // exit - e.g. `taskkill`-adjacent OS shutdown signals Tauri is able
        // to intercept - is covered too.
        if let RunEvent::ExitRequested { .. } = event {
            kill_server_process(app_handle);
        }
    });
}

// Closing the main window now means "hide to tray," matching how the
// Companion's own close button already behaves (see Milestone 2) - the
// ONLY way to fully terminate Atlas going forward is the tray's "Quit
// Atlas" item, which is the intentional design for a persistent desktop
// companion (see this milestone's spec). Without a working tray icon this
// would strand the user with no way back to a hidden main window short of
// a restart - see the report's Known Limitations for that tradeoff. Shared
// by both the debug-mode (synchronous) and release-mode (deferred to a
// background thread) window-creation paths in setup() above.
fn wire_close_to_hide(window: &WebviewWindow) {
    let window_to_hide = window.clone();
    window.on_window_event(move |event| {
        if let WindowEvent::CloseRequested { api, .. } = event {
            api.prevent_close();
            let _ = window_to_hide.hide();
        }
    });
}

fn create_main_window(app: &AppHandle) -> tauri::Result<WebviewWindow> {
    let base_url = app.state::<AppBaseUrl>().0.clone();
    let window = WebviewWindowBuilder::new(app, "main", WebviewUrl::External(base_url.parse().expect("invalid Atlas server URL")))
        .title("Atlas")
        // A sensible default for the existing dashboard layout - not a
        // cramped mobile-style window. Still fully resizable; this is just
        // the size Atlas opens at on a first-ever launch (tauri-plugin-
        // window-state overrides this with a saved size/position on every
        // later launch).
        .inner_size(1440.0, 900.0)
        .min_inner_size(1024.0, 700.0)
        .resizable(true)
        .center()
        .build()?;

    Ok(window)
}

// The single place both the tray and the global shortcut go through to
// create the Companion window when it doesn't exist yet in the current
// process (e.g. the tray's "Show Focus Companion" clicked before any Quest
// has ever been taken this session) - mirrors
// app/(app)/_lib/desktop/focus-companion-window.ts's showFocusCompanionWindow
// exactly (same label, same size/flags/URL shape) since that's the far more
// common path (TAKE QUEST) and the two must never drift into visibly
// different windows.
fn create_focus_companion_window(app: &AppHandle) -> tauri::Result<WebviewWindow> {
    let base_url = app.state::<AppBaseUrl>().0.clone();
    let companion_url = format!("{base_url}/focus-companion");
    let (x, y) = compute_default_companion_position(app);

    let window = WebviewWindowBuilder::new(app, FOCUS_COMPANION_LABEL, WebviewUrl::External(companion_url.parse().expect("invalid Focus Companion URL")))
        .title("Atlas Focus")
        .inner_size(FOCUS_COMPANION_WIDTH, FOCUS_COMPANION_HEIGHT)
        .min_inner_size(FOCUS_COMPANION_MIN_WIDTH, FOCUS_COMPANION_MIN_HEIGHT)
        .position(x, y)
        .always_on_top(true)
        .decorations(false)
        .resizable(true)
        .skip_taskbar(true)
        .shadow(true)
        .visible(true)
        .focused(true)
        .build()?;

    Ok(window)
}

fn compute_default_companion_position(app: &AppHandle) -> (f64, f64) {
    match app.primary_monitor() {
        Ok(Some(monitor)) => {
            let scale = monitor.scale_factor();
            let size = monitor.size().to_logical::<f64>(scale);
            let position = monitor.position().to_logical::<f64>(scale);
            (
                position.x + size.width - FOCUS_COMPANION_WIDTH - SCREEN_MARGIN_RIGHT,
                position.y + size.height - FOCUS_COMPANION_HEIGHT - SCREEN_MARGIN_BOTTOM,
            )
        }
        _ => (0.0, 0.0),
    }
}

// Guards against tauri-plugin-window-state restoring a position left over
// from a monitor that's since been disconnected, resized, or rearranged -
// the plugin persists whatever position was last observed but has no way to
// know that position is still valid on THIS launch. Called right after every
// window creation/show, once the (possibly just-restored) position is
// final: if the window doesn't meaningfully overlap any currently-connected
// monitor, it's moved back to the same bottom-right default a first-ever
// launch would use, on whatever monitor is primary now.
pub(crate) fn ensure_window_within_visible_bounds(window: &WebviewWindow) {
    let (Ok(position), Ok(size)) = (window.outer_position(), window.outer_size()) else {
        return;
    };
    let Ok(monitors) = window.available_monitors() else {
        return;
    };

    let window_left = position.x;
    let window_top = position.y;
    let window_right = position.x + size.width as i32;
    let window_bottom = position.y + size.height as i32;

    let visible_on_some_monitor = monitors.iter().any(|monitor| overlap_px(window_left, window_top, window_right, window_bottom, monitor) >= MIN_VISIBLE_OVERLAP_PX);

    if visible_on_some_monitor {
        return;
    }

    let (x, y) = default_position_for_label(window.app_handle(), window.label());
    let _ = window.set_position(Position::Logical(LogicalPosition { x, y }));
}

// Dispatches the "saved position is off-screen, put it somewhere sane"
// fallback by window label - a floating widget (Milestone 4) needs its OWN
// size-appropriate default, not the Focus Companion's, which was the only
// option this function had before widgets.rs existed. "main" and
// "focus-companion" (and anything else unrecognized) keep the exact
// previous fallback, unchanged.
fn default_position_for_label(app: &AppHandle, label: &str) -> (f64, f64) {
    if let Some(definition) = widgets::find_definition_by_label(label) {
        return widgets::compute_default_position(app, definition);
    }
    compute_default_companion_position(app)
}

// The shorter side of the overlap rectangle between a window's bounds and
// one monitor, in physical pixels - both 0 (no overlap) and a negative
// result (no overlap, further apart) are treated the same by the caller's
// `>= MIN_VISIBLE_OVERLAP_PX` check.
fn overlap_px(window_left: i32, window_top: i32, window_right: i32, window_bottom: i32, monitor: &Monitor) -> i32 {
    let monitor_position = monitor.position();
    let monitor_size = monitor.size();
    let monitor_left = monitor_position.x;
    let monitor_top = monitor_position.y;
    let monitor_right = monitor_position.x + monitor_size.width as i32;
    let monitor_bottom = monitor_position.y + monitor_size.height as i32;

    let overlap_width = window_right.min(monitor_right) - window_left.max(monitor_left);
    let overlap_height = window_bottom.min(monitor_bottom) - window_top.max(monitor_top);

    overlap_width.min(overlap_height)
}

fn show_focus_companion_window(app: &AppHandle) {
    match app.get_webview_window(FOCUS_COMPANION_LABEL) {
        Some(window) => {
            ensure_window_within_visible_bounds(&window);
            let _ = window.show();
            let _ = window.set_focus();
        }
        None => {
            let _ = create_focus_companion_window(app);
        }
    }
}

fn hide_focus_companion_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window(FOCUS_COMPANION_LABEL) {
        let _ = window.hide();
    }
}

fn toggle_focus_companion_window(app: &AppHandle) {
    match app.get_webview_window(FOCUS_COMPANION_LABEL) {
        Some(window) => {
            if window.is_visible().unwrap_or(false) {
                let _ = window.hide();
            } else {
                ensure_window_within_visible_bounds(&window);
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
        None => {
            let _ = create_focus_companion_window(app);
        }
    }
}

fn build_tray(app: &AppHandle) -> tauri::Result<()> {
    let open_atlas = MenuItem::with_id(app, "open-atlas", "Open Atlas", true, None::<&str>)?;
    let show_companion = MenuItem::with_id(app, "show-companion", "Show Focus Companion", true, None::<&str>)?;
    let hide_companion = MenuItem::with_id(app, "hide-companion", "Hide Focus Companion", true, None::<&str>)?;

    // Milestone 4 - one Show/Hide pair PER registered floating widget,
    // generated from widgets::WIDGET_DEFINITIONS so a future widget only
    // ever needs adding to that one list - this loop and the
    // on_menu_event dispatch below never need a new hand-written branch.
    let mut widget_items: Vec<MenuItem<tauri::Wry>> = Vec::new();
    for definition in widgets::WIDGET_DEFINITIONS {
        widget_items.push(MenuItem::with_id(app, format!("show-widget-{}", definition.id), format!("Show {}", definition.menu_label), true, None::<&str>)?);
        widget_items.push(MenuItem::with_id(app, format!("hide-widget-{}", definition.id), format!("Hide {}", definition.menu_label), true, None::<&str>)?);
    }
    let widget_item_refs: Vec<&dyn IsMenuItem<tauri::Wry>> = widget_items.iter().map(|item| item as &dyn IsMenuItem<tauri::Wry>).collect();
    let widgets_submenu = Submenu::with_items(app, "Floating Widgets", true, &widget_item_refs)?;

    let quit = MenuItem::with_id(app, "quit-atlas", "Quit Atlas", true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&open_atlas, &show_companion, &hide_companion, &widgets_submenu, &PredefinedMenuItem::separator(app)?, &quit])?;

    // Reuses Atlas's own bundled icon (embedded at compile time, so it
    // works from the installed app's resource layout too) rather than a
    // second, separately-maintained tray-only asset.
    let icon = tauri::image::Image::from_bytes(include_bytes!("../icons/32x32.png"))?;

    TrayIconBuilder::new()
        .icon(icon)
        .tooltip("Atlas")
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| {
            let id = event.id().as_ref();

            if let Some(widget_id) = id.strip_prefix("show-widget-") {
                widgets::show_widget_window(app, widget_id);
                return;
            }
            if let Some(widget_id) = id.strip_prefix("hide-widget-") {
                widgets::hide_widget_window(app, widget_id);
                return;
            }

            match id {
                "open-atlas" => {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
                "show-companion" => show_focus_companion_window(app),
                "hide-companion" => hide_focus_companion_window(app),
                "quit-atlas" => app.exit(0),
                _ => {}
            }
        })
        .build(app)?;

    Ok(())
}

fn kill_server_process(app: &AppHandle) {
    #[cfg(not(debug_assertions))]
    if let Some(state) = app.try_state::<ServerProcess>() {
        if let Some(mut child) = state.0.lock().unwrap().take() {
            let _ = child.kill();
        }
    }
    let _ = app;
}

// See spawn_atlas_server's own comment for why this exists: Node.js can't
// reliably load a script from a Windows extended-length (`\\?\`-prefixed)
// path. A plain string-prefix strip is enough here - every path this is
// applied to is a real, existing, already-absolute filesystem path well
// under MAX_PATH, never a UNC network path or anything else `\\?\` is
// actually load-bearing for.
#[cfg(not(debug_assertions))]
fn strip_extended_length_prefix(path: &std::path::Path) -> std::path::PathBuf {
    match path.to_string_lossy().strip_prefix(r"\\?\") {
        Some(stripped) => std::path::PathBuf::from(stripped),
        None => path.to_path_buf(),
    }
}

#[cfg(not(debug_assertions))]
fn spawn_atlas_server(app: &tauri::AppHandle) -> tauri::Result<Child> {
    use std::process::{Command, Stdio};

    // `npm run build:desktop` (see package.json / tauri.conf.json's
    // beforeBuildCommand) produces `.next/standalone`, which
    // `tauri.conf.json`'s bundle.resources copies into the installed app's
    // resource directory alongside `.next/static` and `public` - Next.js's
    // own documented layout for a self-contained standalone server.
    //
    // Milestone 5 - THE root cause of the "node never actually starts,
    // even with an absolute path to a verified-working binary" bug (see
    // the desktop startup diagnosis/fix report): `resource_dir()` returns
    // a Windows EXTENDED-LENGTH path (the `\\?\` prefix Rust's own
    // std::fs::canonicalize/current_exe add on Windows by design). Node.js
    // crashes almost instantly trying to load a script from a `\\?\`-
    // prefixed path - confirmed live via real stderr capture:
    // "EISDIR: illegal operation on a directory, lstat 'C:'" from
    // Module._findPath -> toRealPath -> fs.realpathSync, a known Node.js
    // limitation with that path form. This is a COMPLETELY SEPARATE bug
    // from the PATH-dependent `Command::new("node")` and the main-thread-
    // blocking issues this milestone also fixes - all three had to be
    // fixed together to get a working release build. Stripping the prefix
    // yields a perfectly valid, absolute Windows path (nowhere near
    // MAX_PATH here) that both `Command` and Node itself handle correctly.
    let resource_dir = strip_extended_length_prefix(&app.path().resource_dir()?);
    let standalone_dir = resource_dir.join(".next").join("standalone");
    let server_js = standalone_dir.join("server.js");
    log_diag(&format!("spawn_atlas_server: resource_dir={} exists={}", resource_dir.display(), resource_dir.exists()));
    log_diag(&format!("spawn_atlas_server: server_js={} exists={}", server_js.display(), server_js.exists()));

    // Milestone 5 - Atlas bundles its OWN Node.js runtime
    // (src-tauri/binaries/node.exe, see binaries/NOTICE.md; also mapped
    // into resources by tauri.conf.json) rather than relying on the end
    // user's machine having Node installed/on PATH - a real, confirmed-live
    // production bug (see the desktop startup diagnosis report): a bare
    // `Command::new("node")` depends entirely on PATH resolution in the
    // CHILD process's inherited environment, which live testing proved
    // unreliable for a GUI app launched outside an interactive dev shell -
    // and it failed completely SILENTLY (Stdio::null() below, plus release
    // builds strip the one diagnostic eprintln! that used to explain it),
    // so Atlas just hung forever with no window and no visible error.
    // Spawning an absolute path to the bundled binary removes the PATH
    // dependency entirely. It does NOT remove the need for honest failure
    // reporting if the bundled binary is somehow missing (corrupted
    // install, antivirus quarantine, ...) - hence the explicit existence
    // check and specific error message below, instead of letting a mystery
    // "file not found" bubble up from Command::spawn() itself.
    let node_binary = resource_dir.join("node.exe");
    log_diag(&format!("spawn_atlas_server: node_binary={} exists={}", node_binary.display(), node_binary.exists()));

    if !node_binary.exists() {
        log_diag("spawn_atlas_server: ABORTING - bundled node.exe missing");
        return Err(tauri::Error::Io(std::io::Error::new(
            std::io::ErrorKind::NotFound,
            format!(
                "Atlas's bundled Node.js runtime is missing ({}). This usually means the installation is corrupted or incomplete - try reinstalling Atlas.",
                node_binary.display()
            ),
        )));
    }

    // Phase 19.5 - JARVIS's server route reads process.env.ANTHROPIC_API_KEY
    // (and the optional ANTHROPIC_MODEL). In `next dev`, Next.js loads
    // `.env.local` itself, so this is a non-issue there. The bundled
    // STANDALONE server this function spawns is different: confirmed by
    // reading the actual generated `.next/standalone/server.js` - it only
    // ever reads PORT/HOSTNAME/KEEP_ALIVE_TIMEOUT from the real process
    // environment and never loads any `.env*` file itself (this is
    // documented Next.js standalone-output behavior, not a bug in Atlas).
    // `Command` already inherits the parent (this Atlas.exe) process's own
    // environment by default, so making the forward explicit here is a
    // deliberate, minimal, secure fix: it does NOT read `.env.local`, does
    // NOT bundle any secret into the installer, and does NOT hardcode a
    // key - a release build simply needs ANTHROPIC_API_KEY set as a real
    // Windows user/system environment variable before Atlas.exe is
    // launched (see .env.local.example's note on this). Absent, JARVIS
    // just reports "not configured," same graceful degradation as today.
    // TEMPORARY diagnostic instrumentation (see log_diag's own comment) -
    // captures the bundled Next.js/Node server's REAL stdout/stderr to files
    // instead of discarding them (Stdio::null(), the normal/permanent
    // behavior), so a server-side crash or startup error is visible when
    // comparing the Explorer vs. PowerShell launch cases. Best-effort: if
    // the log files can't be opened for some reason, falls back to
    // Stdio::null() rather than failing the whole spawn over a diagnostic.
    let stdout_target = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(std::env::temp_dir().join("atlas-node-stdout.log"))
        .map(Stdio::from)
        .unwrap_or_else(|_| Stdio::null());
    let stderr_target = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(std::env::temp_dir().join("atlas-node-stderr.log"))
        .map(Stdio::from)
        .unwrap_or_else(|_| Stdio::null());

    log_diag(&format!(
        "spawn_atlas_server: launching {} {} (cwd={})",
        node_binary.display(),
        server_js.display(),
        standalone_dir.display()
    ));

    let child = Command::new(&node_binary)
        .arg(&server_js)
        .current_dir(&standalone_dir)
        .env("PORT", APP_PORT.to_string())
        .env("HOSTNAME", "127.0.0.1")
        .envs(std::env::var("ANTHROPIC_API_KEY").ok().map(|value| ("ANTHROPIC_API_KEY".to_string(), value)))
        .envs(std::env::var("ANTHROPIC_MODEL").ok().map(|value| ("ANTHROPIC_MODEL".to_string(), value)))
        .stdout(stdout_target)
        .stderr(stderr_target)
        .spawn()
        .map_err(|error| {
            tauri::Error::Io(std::io::Error::new(
                std::io::ErrorKind::Other,
                format!("Failed to start the Atlas server using the bundled Node runtime ({}): {}.", node_binary.display(), error),
            ))
        })?;

    Ok(child)
}

// Returns whether the port actually became reachable within the retry
// budget - previously (), swapped to a bool as part of TEMPORARY diagnostic
// instrumentation (see log_diag's own comment) so the caller can log
// success/failure/elapsed time rather than always silently proceeding to
// open a window regardless of what happened.
#[cfg(not(debug_assertions))]
fn wait_for_server(port: u16) -> bool {
    use std::net::{SocketAddr, TcpStream};
    use std::time::Duration;

    // Milestone 5 - each connect attempt now has an explicit, bounded
    // per-attempt timeout, rather than relying on the OS refusing a
    // loopback connection near-instantly when nothing is listening yet.
    // Live testing on this exact codebase proved that assumption doesn't
    // always hold - a connect attempt was directly observed sitting in
    // SYN_SENT rather than failing fast - which could silently turn this
    // "up to ~15s in practice" budget into several minutes. Bounding each
    // individual attempt keeps the REAL total elapsed time close to the
    // intended ~15s regardless of that platform/network behavior. This
    // function already runs off the main/setup thread (see setup() above),
    // so it's safe for it to still take up to its full budget in the worst
    // case - it just won't make the window that much slower to appear.
    let address: SocketAddr = ([127, 0, 0, 1], port).into();
    for _ in 0..30 {
        if TcpStream::connect_timeout(&address, Duration::from_millis(500)).is_ok() {
            return true;
        }
    }
    false
}
