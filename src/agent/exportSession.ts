import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";

export async function exportTextFile(contents: string) {
  const path = await save({
    defaultPath: "anchor-session-summary.txt",
    filters: [
      {
        name: "Text",
        extensions: ["txt"],
      },
    ],
  });

  if (!path) return false;

  await writeTextFile(path, contents);
  return true;
}
