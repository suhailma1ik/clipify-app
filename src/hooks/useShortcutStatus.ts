import { useState } from 'react';

export const useShortcutStatus = () => {
  const [shortcutStatus, setShortcutStatus] = useState<string>(
    "Global shortcut Cmd+Shift+C ready to capture text"
  );

  return {
    shortcutStatus,
    setShortcutStatus
  };
};