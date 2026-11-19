use serde_json::Value;

/// Simpan state proyek ke file .kreatif.json
#[tauri::command]
pub async fn save_project(path: String, data: Value) -> Result<String, String> {
    // TODO: Tulis JSON ke file dengan pretty print
    // Gunakan tauri_plugin_fs atau std::fs
    std::fs::write(&path, serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())?;
    Ok(format!("Proyek tersimpan: {}", path))
}

/// Muat state proyek dari file .kreatif.json
#[tauri::command]
pub async fn load_project(path: String) -> Result<Value, String> {
    let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let data: Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    Ok(data)
}

/// Auto-save proyek ke direktori autosave
#[tauri::command]
pub async fn auto_save(project_id: String, data: Value) -> Result<String, String> {
    // TODO: Simpan ke ~/.kreatif-studio/autosave/<project_id>.autosave.json
    let autosave_dir = dirs::data_dir()
        .unwrap_or_default()
        .join("kreatif-studio")
        .join("autosave");
    std::fs::create_dir_all(&autosave_dir).map_err(|e| e.to_string())?;

    let autosave_path = autosave_dir.join(format!("{}.autosave.json", project_id));
    std::fs::write(
        &autosave_path,
        serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;

    Ok(format!("Auto-save: {:?}", autosave_path))
}
