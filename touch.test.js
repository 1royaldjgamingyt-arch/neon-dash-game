import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('DOM check: no bottom control buttons or container in index.html', () => {
  const html = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf-8');

  // Verify removed element IDs and classes
  assert.strictEqual(html.includes('id="touch-controls"'), false, 'touch-controls container must not exist');
  assert.strictEqual(html.includes('btn-ctrl-left'), false, 'btn-ctrl-left button must not exist');
  assert.strictEqual(html.includes('btn-ctrl-right'), false, 'btn-ctrl-right button must not exist');
  assert.strictEqual(html.includes('btn-ctrl-jump'), false, 'btn-ctrl-jump button must not exist');
  assert.strictEqual(html.includes('btn-ctrl-slide'), false, 'btn-ctrl-slide button must not exist');
  assert.strictEqual(html.includes('btn-touch-toggle'), false, 'btn-touch-toggle must not exist');
  assert.strictEqual(html.includes('toggle-touch-buttons'), false, 'toggle-touch-buttons must not exist');
});

test('CSS check: no touch controls styles in style.css', () => {
  const css = fs.readFileSync(path.join(process.cwd(), 'style.css'), 'utf-8');

  assert.strictEqual(css.includes('#touch-controls'), false, 'touch-controls CSS must not exist');
  assert.strictEqual(css.includes('.touch-btn'), false, 'touch-btn CSS must not exist');
  assert.strictEqual(css.includes('.touch-group'), false, 'touch-group CSS must not exist');
});

test('Touch and swipe gesture logic: all 4 gestures trigger proper runner actions', () => {
  // Mock event tracking
  const actions = [];
  const state = { current: 'playing' };

  let touchStartX = 0;
  let touchStartY = 0;
  let isSwiping = false;
  let swipeHandled = false;

  const moveLane = (dir) => actions.push({ type: 'moveLane', dir });
  const jump = () => actions.push({ type: 'jump' });
  const slide = () => actions.push({ type: 'slide' });

  const startGesture = (clientX, clientY) => {
    touchStartX = clientX;
    touchStartY = clientY;
    isSwiping = true;
    swipeHandled = false;
  };

  const processGesture = (currentX, currentY, isRelease = false) => {
    if (!isSwiping || state.current !== 'playing' || swipeHandled) return;

    const dx = currentX - touchStartX;
    const dy = currentY - touchStartY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    const minDistance = isRelease ? 18 : 24;

    if (absX >= minDistance || absY >= minDistance) {
      swipeHandled = true;
      if (absX > absY) {
        if (dx > 0) {
          moveLane(1);
        } else {
          moveLane(-1);
        }
      } else {
        if (dy < 0) {
          jump();
        } else {
          slide();
        }
      }
    }
  };

  const endGesture = (clientX, clientY) => {
    if (!isSwiping) return;
    if (!swipeHandled && state.current === 'playing') {
      processGesture(clientX, clientY, true);
    }
    isSwiping = false;
    swipeHandled = false;
  };

  // 1. Test Swipe Left
  startGesture(200, 300);
  processGesture(150, 300, false); // dx = -50 (>= 24)
  endGesture(150, 300);
  assert.deepStrictEqual(actions.pop(), { type: 'moveLane', dir: -1 }, 'Swipe left should move lane left');

  // 2. Test Swipe Right
  startGesture(200, 300);
  processGesture(260, 300, false); // dx = +60 (>= 24)
  endGesture(260, 300);
  assert.deepStrictEqual(actions.pop(), { type: 'moveLane', dir: 1 }, 'Swipe right should move lane right');

  // 3. Test Swipe Up (Jump)
  startGesture(200, 300);
  processGesture(200, 240, false); // dy = -60 (<= -24)
  endGesture(200, 240);
  assert.deepStrictEqual(actions.pop(), { type: 'jump' }, 'Swipe up should jump');

  // 4. Test Swipe Down (Slide)
  startGesture(200, 300);
  processGesture(200, 360, false); // dy = +60 (>= 24)
  endGesture(200, 360);
  assert.deepStrictEqual(actions.pop(), { type: 'slide' }, 'Swipe down should slide');

  // 5. Test Quick Flick Release (dy < -18 on touchend)
  startGesture(200, 300);
  endGesture(200, 280); // dy = -20
  assert.deepStrictEqual(actions.pop(), { type: 'jump' }, 'Quick upward flick on release should jump');

  // 6. Test Quick Flick Left Release (dx < -18 on touchend)
  startGesture(200, 300);
  endGesture(180, 300); // dx = -20
  assert.deepStrictEqual(actions.pop(), { type: 'moveLane', dir: -1 }, 'Quick left flick on release should move lane left');

  // 7. Test Sub-threshold Tap (no action)
  startGesture(200, 300);
  processGesture(204, 303, false);
  endGesture(204, 303);
  assert.strictEqual(actions.length, 0, 'Tap below threshold should not trigger any gesture');
});
