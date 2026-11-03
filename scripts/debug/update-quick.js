const fs = require('fs');
const path = 'app/staff.css';
let content = fs.readFileSync(path, 'utf8');
const start = content.indexOf('.staff-quick-pill');
const end = content.indexOf('\n.staff-', start + 1);
if(start === -1 || end === -1){ console.log('bad'); process.exit(0); }
const old = content.substring(start, end);
const neu = `.staff-quick-pill {
  min-height: 84px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid var(--staff-line);
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(246, 250, 255, 0.98) 100%);
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
  text-align: left;
  transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
}

.staff-quick-pill:active {
  transform: translateY(1px) scale(0.98);
}

.staff-quick-pill:focus-visible {
  outline: 2px solid rgba(15, 107, 205, 0.6);
  outline-offset: 2px;
}

.staff-quick-icon {
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: radial-gradient(circle at top, rgba(20, 123, 227, 0.26), rgba(14, 95, 196, 0.16));
  color: #0f6bcd;
  flex: 0 0 auto;
}

.staff-quick-icon .staff-icon {
  width: 22px;
  height: 22px;
}

.staff-quick-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.staff-quick-text strong {
  font-size: 0.92rem;
}

.staff-quick-text small {
  font-size: 0.76rem;
  color: var(--staff-text-subtle);
}`;
content = content.replace(old, neu);
fs.writeFileSync(path, content, 'utf8');
console.log('done');
