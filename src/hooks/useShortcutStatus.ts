import { useState } from 'react';
import { statusMessages } from '../utils/statusUtils';

export const useShortcutStatus = () => {
  const [shortcutStatus, setShortcutStatus] = useState<string>(
    statusMessages.ready
  );

  return {
    shortcutStatus,
    setShortcutStatus
  };
};