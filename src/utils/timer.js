export const parseRestSeconds = (restInput) => {
  if (typeof restInput === 'number' && !isNaN(restInput)) {
    return Math.max(1, Math.round(restInput));
  }
  if (!restInput || typeof restInput !== 'string') return 60;

  const text = restInput.trim().toLowerCase();

  // "2 min" or "1.5 min" or "2m"
  const minMatch = text.match(/([\d.]+)\s*(?:min|m\b)/);
  if (minMatch) {
    const mins = parseFloat(minMatch[1]);
    return Math.max(1, Math.round(mins * 60));
  }

  // Range like "60-90s" or "60 - 90 sec" -> default to lower bound
  const rangeMatch = text.match(/(\d+)\s*-\s*(\d+)/);
  if (rangeMatch) {
    return Math.max(1, parseInt(rangeMatch[1], 10));
  }

  // "90s" or "90 sec" or "90"
  const secMatch = text.match(/(\d+)/);
  if (secMatch) {
    return Math.max(1, parseInt(secMatch[1], 10));
  }

  return 60;
};

export const formatTimer = (totalSeconds) => {
  const safe = Math.max(0, Math.round(totalSeconds || 0));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};
