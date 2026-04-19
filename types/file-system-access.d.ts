interface DirectoryPickerOptions {
  id?: string
  startIn?:
    | "desktop"
    | "documents"
    | "downloads"
    | "music"
    | "pictures"
    | "videos"
    | FileSystemHandle
  mode?: "read" | "readwrite"
}

interface Window {
  showDirectoryPicker(
    options?: DirectoryPickerOptions
  ): Promise<FileSystemDirectoryHandle>
}

interface FileSystemHandle {
  queryPermission(descriptor: {
    mode: "read" | "readwrite"
  }): Promise<PermissionState>
  requestPermission(descriptor: {
    mode: "read" | "readwrite"
  }): Promise<PermissionState>
}
