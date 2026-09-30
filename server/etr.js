/**
 * Automated Estimated Time of Restoration (ETR) Algorithm
 * Computes projected repair times based on fault severity, affected infrastructure,
 * and real-time weather constraints.
 */

function calculateETR(outageType = '', weatherCode = null, clusterSize = 1) {
  const normalized = (outageType || '').toLowerCase();
  let baseMinutes = 120; // Default 2 hours
  let faultDescription = 'Standard lateral fuse / distribution line inspection';

  if (normalized.includes('line down') || normalized.includes('fallen') || normalized.includes('sparking') || normalized.includes('transformer')) {
    baseMinutes = 360; // 6 hours
    faultDescription = 'Primary conductor / distribution transformer replacement';
  } else if (normalized.includes('total') || normalized.includes('blackout') || normalized.includes('feeder') || normalized.includes('substation')) {
    baseMinutes = 180; // 3 hours
    faultDescription = 'Feeder circuit breaker trip & sectionalizing repair';
  } else if (normalized.includes('low voltage') || normalized.includes('partial') || normalized.includes('fluctuat')) {
    baseMinutes = 90; // 1.5 hours
    faultDescription = 'Secondary line balancing & tap changer adjustment';
  } else if (normalized.includes('house') || normalized.includes('isolated')) {
    baseMinutes = 45; // 45 mins
    faultDescription = 'Service drop wire & metering reconnect';
  }

  // Multi-cluster impact (if more than 5 reports clustered together)
  if (clusterSize >= 5) {
    baseMinutes = Math.round(baseMinutes * 1.25);
    faultDescription += ' (High-density multi-household cluster)';
  }

  // Weather safety protocol (Linemen pole-climbing restrictions)
  let weatherFactor = 1.0;
  let weatherNote = '';
  if (weatherCode !== null && weatherCode !== undefined) {
    const code = Number(weatherCode);
    if (code >= 95) {
      // Thunderstorms with lightning -> severe safety buffer
      weatherFactor = 1.5;
      weatherNote = ' [+50% Lightning Safety Buffer: Linemen climbing halted during lightning]';
    } else if (code >= 61 && code <= 82) {
      // Rain / Downpour -> moderate delay
      weatherFactor = 1.25;
      weatherNote = ' [+25% Inclement Weather Delay: Wet-condition line safety]';
    }
  }

  const totalMinutes = Math.round(baseMinutes * weatherFactor);
  const now = new Date();
  const projectedDate = new Date(now.getTime() + totalMinutes * 60 * 1000);

  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const durationText = hours > 0 ? `${hours}h ${mins > 0 ? `${mins}m` : ''}`.trim() : `${mins} mins`;

  // Format to 12-hour time e.g. "4:30 PM"
  const timeFormatted = projectedDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  return {
    totalMinutes,
    durationText,
    estimatedIso: projectedDate.toISOString(),
    displayTime: `${timeFormatted} (approx. ${durationText})`,
    reason: `${faultDescription}${weatherNote}`
  };
}

module.exports = {
  calculateETR
};
