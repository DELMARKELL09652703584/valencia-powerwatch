const fs = require('fs');
const path = 'app/staff.css';
let content = fs.readFileSync(path, 'utf8');
const old = `.staff-quick-nav {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin: 0 0 14px;
}

.staff-quick-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px 6px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 251, 255, 0.98) 100%);
  text-align: center;
  min-height: 76px;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.05);
}

.staff-quick-pill:active {
  transform: scale(0.98);
}

.staff-quick-icon {
  position: relative;
  width: 34px;
  height: 34px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: rgba(14, 116, 218, 0.12);
  color: #0f6bcd;
}

.staff-quick-icon .staff-icon {
  width: 18px;
  height: 18px;
}

.staff-quick-text strong {
  display: block;
  font-size: 0.8rem;
}

.staff-quick-text small {
  display: block;
  font-size: 0.68rem;
  color: var(--staff-text-subtle);
}`;
const neu = `.staff-quick-nav {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin: 0 0 14px;
}

.staff-quick-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px 6px;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 251, 255, 0.98) 100%);
  text-align: center;
  min-height: 82px;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.05);
  transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
}

.staff-quick-pill:active {
  transform: scale(0.98);
}

.staff-quick-pill:focus-visible {
  outline: 2px solid rgba(15, 107, 205, 0.6);
  outline-offset: 2px;
}

.staff-quick-icon {
  position: relative;
  width: 36px;
  height: 36px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: rgba(14, 116, 218, 0.12);
  color: #0f6bcd;
}

.staff-quick-icon .staff-icon {
  width: 20px;
  height: 20px;
}

.staff-quick-text strong {
  display: block;
  font-size: 0.82rem;
}

.staff-quick-text small {
  display: block;
  font-size: 0.7rem;
  color: var(--staff-text-subtle);
}`;
if(content.includes(old)){
  content = content.replace(old, neu);
  fs.writeFileSync(path, content, 'utf8');
  console.log('replaced');
} else {
  console.log('not found');
}
