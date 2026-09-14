// Atlas Desktop Floating Widgets - generalizes the EXACT window-creation
// pattern lib.rs already uses for the Focus Companion (Milestone 2:
// always-on-top, frameless, resizable, skip-taskbar, loading a same-origin
// Next.js route) into a small per-widget metadata table plus create/show/
// hide/toggle helpers, so the tray (and any future native entry point) can
// manage every floating widget through one uniform path instead of one
// hand-written function per widget.
//
// The Focus Companion itself is DELIBERATELY NOT one of the definitions
// here - it already has its own create/show/hide/toggle functions in
// lib.rs, unchanged. Duplicating them under a different name would be
// exactly the kind of parallel implementation this feature is supposed to
// avoid; lib.rs's tray code calls both this module's functions and the
// existing Focus Companion functions side by side. This mirrors the JS
// side exactly: _lib/desktop/widgets/registry.ts also treats "focus" as
// the existing Companion rather than a new definition.
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder};

pub struct WidgetDefinition {
    pub id: &'static str,
    pub label: &'static str,
    pub title: &'static str,
    // A short, tray-menu-friendly name ("Current Quest Widget") - distinct
    // from `title` (the OS window title, "Atlas - Current Quest") so the
    // generated "Show {menu_label}"/"Hide {menu_label}" tray items read
    // naturally without needing a separate hand-written label per widget.
    pub menu_label: &'static str,
    pub path: &'static str,
    pub width: f64,
    pub height: f64,
    pub min_width: f64,
    pub min_height: f64,
    // How many OTHER widgets (by their own stack_index) sit below this
    // one's default bottom-right placement - mirrors the JS registry's
    // own offsetIndex, so a first-ever launch stacks them the same way
    // regardless of whether the tray or the JS widget-manager created them
    // first.
    pub stack_index: u8,
}

pub const WIDGET_DEFINITIONS: &[WidgetDefinition] = &[
    WidgetDefinition { id: "current-quest", label: "widget-current-quest", title: "Atlas - Current Quest", menu_label: "Current Quest Widget", path: "/widget/current-quest", width: 300.0, height: 160.0, min_width: 240.0, min_height: 120.0, stack_index: 1 },
    WidgetDefinition { id: "priority", label: "widget-priority", title: "Atlas - Priority", menu_label: "Priority Widget", path: "/widget/priority", width: 260.0, height: 140.0, min_width: 220.0, min_height: 110.0, stack_index: 2 },
    WidgetDefinition { id: "xp", label: "widget-xp", title: "Atlas - XP", menu_label: "XP Widget", path: "/widget/xp", width: 260.0, height: 120.0, min_width: 220.0, min_height: 100.0, stack_index: 3 },
];

const MARGIN_RIGHT: f64 = 24.0;
const MARGIN_BOTTOM: f64 = 60.0;
const STACK_GAP: f64 = 16.0;

pub fn find_definition(id: &str) -> Option<&'static WidgetDefinition> {
    WIDGET_DEFINITIONS.iter().find(|definition| definition.id == id)
}

pub fn find_definition_by_label(label: &str) -> Option<&'static WidgetDefinition> {
    WIDGET_DEFINITIONS.iter().find(|definition| definition.label == label)
}

// Pulled out of compute_default_position below so it's testable without a
// live AppHandle (which a unit test can't easily construct) - pure
// arithmetic over the static WIDGET_DEFINITIONS table only.
fn stacked_offset_for(definition: &WidgetDefinition) -> f64 {
    WIDGET_DEFINITIONS.iter().filter(|other| other.stack_index < definition.stack_index).map(|other| other.height + STACK_GAP).sum()
}

// Same stacked-bottom-right placement algorithm as
// _lib/desktop/widgets/widget-manager.ts's computePosition - kept in sync
// deliberately (like FOCUS_COMPANION_WIDTH/HEIGHT already are between this
// crate and the JS side), not shared code, since Rust has no window to
// create for "focus" and JS has no reason to import Rust.
pub fn compute_default_position(app: &AppHandle, definition: &WidgetDefinition) -> (f64, f64) {
    match app.primary_monitor() {
        Ok(Some(monitor)) => {
            let scale = monitor.scale_factor();
            let size = monitor.size().to_logical::<f64>(scale);
            let position = monitor.position().to_logical::<f64>(scale);
            (
                position.x + size.width - definition.width - MARGIN_RIGHT,
                position.y + size.height - definition.height - MARGIN_BOTTOM - stacked_offset_for(definition),
            )
        }
        _ => (0.0, 0.0),
    }
}

fn create_widget_window(app: &AppHandle, definition: &WidgetDefinition) -> tauri::Result<WebviewWindow> {
    let base_url = app.state::<crate::AppBaseUrl>().0.clone();
    let widget_url = format!("{base_url}{}", definition.path);
    let (x, y) = compute_default_position(app, definition);

    WebviewWindowBuilder::new(app, definition.label, WebviewUrl::External(widget_url.parse().expect("invalid widget URL")))
        .title(definition.title)
        .inner_size(definition.width, definition.height)
        .min_inner_size(definition.min_width, definition.min_height)
        .position(x, y)
        .always_on_top(true)
        .decorations(false)
        .resizable(true)
        .skip_taskbar(true)
        .shadow(true)
        .visible(true)
        .focused(true)
        .build()
}

pub fn show_widget_window(app: &AppHandle, id: &str) {
    let Some(definition) = find_definition(id) else { return };
    match app.get_webview_window(definition.label) {
        Some(window) => {
            crate::ensure_window_within_visible_bounds(&window);
            let _ = window.show();
            let _ = window.set_focus();
        }
        None => {
            let _ = create_widget_window(app, definition);
        }
    }
}

pub fn hide_widget_window(app: &AppHandle, id: &str) {
    let Some(definition) = find_definition(id) else { return };
    if let Some(window) = app.get_webview_window(definition.label) {
        let _ = window.hide();
    }
}

// create_widget_window/show_widget_window/hide_widget_window all need a
// live AppHandle (a real running Tauri app), which a unit test can't
// easily construct - the same reason os_launcher.rs's own tests only cover
// its pure path-resolution logic directly and leave the one real native
// integration to its own dedicated "genuinely_succeeds" test. Everything
// below is pure data/arithmetic over the static WIDGET_DEFINITIONS table,
// with no window ever created.
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_registered_widget_id_resolves_by_find_definition() {
        for definition in WIDGET_DEFINITIONS {
            assert!(find_definition(definition.id).is_some(), "{} should resolve", definition.id);
        }
    }

    #[test]
    fn an_unregistered_widget_id_resolves_to_none() {
        assert!(find_definition("does-not-exist").is_none());
        // "focus" is deliberately NOT in this table (see the module
        // comment) - it must not resolve here, since doing so would mean
        // this generic path could create a SECOND window for the same
        // Focus Companion label.
        assert!(find_definition("focus").is_none());
    }

    #[test]
    fn every_registered_widget_label_resolves_by_find_definition_by_label() {
        for definition in WIDGET_DEFINITIONS {
            let found = find_definition_by_label(definition.label);
            assert_eq!(found.map(|d| d.id), Some(definition.id));
        }
    }

    #[test]
    fn an_unrecognized_label_resolves_to_none_not_a_guess() {
        assert!(find_definition_by_label("main").is_none());
        assert!(find_definition_by_label("focus-companion").is_none());
    }

    #[test]
    fn every_widget_has_a_unique_id_and_label() {
        let ids: Vec<&str> = WIDGET_DEFINITIONS.iter().map(|d| d.id).collect();
        let labels: Vec<&str> = WIDGET_DEFINITIONS.iter().map(|d| d.label).collect();
        let mut unique_ids = ids.clone();
        unique_ids.sort_unstable();
        unique_ids.dedup();
        let mut unique_labels = labels.clone();
        unique_labels.sort_unstable();
        unique_labels.dedup();

        assert_eq!(ids.len(), unique_ids.len(), "duplicate widget id would silently collide");
        assert_eq!(labels.len(), unique_labels.len(), "duplicate window label would silently collide in Tauri");
    }

    #[test]
    fn the_first_widget_in_stacking_order_has_zero_offset() {
        let first = WIDGET_DEFINITIONS.iter().min_by_key(|d| d.stack_index).expect("at least one widget is registered");
        assert_eq!(stacked_offset_for(first), 0.0);
    }

    #[test]
    fn stacking_offset_grows_with_each_widget_already_placed_above_it() {
        // Real, ordered widgets (stack_index 1, 2, 3 in the actual
        // registry) - each later one must sit strictly further up than
        // the one before it, or they'd visually overlap on a first-ever
        // launch.
        let mut sorted: Vec<&WidgetDefinition> = WIDGET_DEFINITIONS.iter().collect();
        sorted.sort_by_key(|d| d.stack_index);

        let mut previous_offset = f64::NEG_INFINITY;
        for definition in sorted {
            let offset = stacked_offset_for(definition);
            assert!(offset > previous_offset, "{} should stack strictly above the previous widget", definition.id);
            previous_offset = offset;
        }
    }
}
