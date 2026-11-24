// 격자 안의 항목을 끌어서 순서를 바꾼다. 마우스는 바로, 터치는 길게 누른 뒤 끈다.
// 끄는 항목은 손가락을 따라오고, 자리를 내주는 다른 항목들은 미끄러지듯 옮겨 간다.
// 위치는 React 상태가 아니라 요소의 style 로 직접 움직인다 (끄는 동안 매번 다시 그리지 않도록).
import { useEffect, useLayoutEffect, useRef, useState } from 'react'

const LONG_PRESS_MS = 220 // 터치: 이만큼 누르고 있으면 끌기 시작 (그 전에 움직이면 화면 스크롤로 본다)
const MOUSE_SLOP = 4
const TOUCH_SLOP = 8
const SLIDE = 'transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1)'
const SETTLE_MS = 180
const EDGE = 72 // 화면 위·아래 끝에서 이 안쪽으로 끌면 자동으로 스크롤한다
const SCROLL_STEP = 14

// keys: 지금 순서대로의 항목 키. onMove(fromKey, toKey): fromKey 항목을 toKey 항목 자리로 옮긴다.
export function useSortable(keys, onMove) {
  const gridRef = useRef(null)
  const nodes = useRef(new Map()) // key → 요소
  const drag = useRef(null) // 끌고 있는(또는 끌려고 누르고 있는) 항목
  const before = useRef(null) // 순서가 바뀌기 직전의 자리 (key → { left, top })
  const [activeKey, setActiveKey] = useState(null)
  const onMoveRef = useRef(onMove)
  onMoveRef.current = onMove

  // 요소의 원래 자리(격자 기준). transform 으로 옮겨져 있어도 달라지지 않는다.
  const slot = (el) => ({ left: el.offsetLeft, top: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight })

  const api = useRef(null)
  if (!api.current) {
    const snapshot = () => {
      before.current = new Map([...nodes.current].map(([key, el]) => [key, slot(el)]))
    }

    // 끌고 있는 항목을 손가락 위치에 둔다.
    const place = () => {
      const d = drag.current
      const el = d && nodes.current.get(d.key)
      const grid = gridRef.current
      if (!el || !grid) return
      const g = grid.getBoundingClientRect()
      const s = slot(el)
      el.style.transition = 'none'
      el.style.transform = `translate(${d.x - g.left - d.dx - s.left}px, ${d.y - g.top - d.dy - s.top}px) scale(1.04)`
    }

    // 손가락이 다른 항목의 자리 위에 있으면 그 자리로 옮긴다.
    const hit = () => {
      const d = drag.current
      const grid = gridRef.current
      if (!d?.active || !grid) return
      const g = grid.getBoundingClientRect()
      const x = d.x - g.left
      const y = d.y - g.top
      for (const [key, el] of nodes.current) {
        if (key === d.key) continue
        const s = slot(el)
        if (x >= s.left && x <= s.left + s.width && y >= s.top && y <= s.top + s.height) {
          snapshot()
          onMoveRef.current(d.key, key)
          return
        }
      }
    }

    const autoScroll = () => {
      const d = drag.current
      if (!d?.active) return
      const step = d.y < EDGE ? -SCROLL_STEP : d.y > window.innerHeight - EDGE ? SCROLL_STEP : 0
      if (step) {
        window.scrollBy(0, step)
        place()
        hit()
      }
      d.raf = requestAnimationFrame(autoScroll)
    }

    const activate = () => {
      const d = drag.current
      const el = d && nodes.current.get(d.key)
      if (!el || d.active) return
      d.active = true
      clearTimeout(d.timer)
      setActiveKey(d.key)
      if (d.touch) navigator.vibrate?.(8)
      place()
      d.raf = requestAnimationFrame(autoScroll)
    }

    const move = (e) => {
      const d = drag.current
      if (!d || e.pointerId !== d.id) return
      d.x = e.clientX
      d.y = e.clientY
      if (!d.active) {
        const moved = Math.hypot(d.x - d.startX, d.y - d.startY)
        if (d.touch && moved > TOUCH_SLOP) end(e) // 길게 누르기 전에 움직였으면 스크롤하려는 것이다
        else if (!d.touch && moved > MOUSE_SLOP) activate()
        return
      }
      e.preventDefault()
      place()
      hit()
    }

    const end = (e) => {
      const d = drag.current
      if (!d || (e && e.pointerId !== d.id)) return
      drag.current = null
      clearTimeout(d.timer)
      cancelAnimationFrame(d.raf)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
      if (!d.active) return
      // 놓으면 제자리로 부드럽게 들어간다.
      const el = nodes.current.get(d.key)
      if (el) {
        el.style.transition = `transform ${SETTLE_MS}ms ease`
        el.style.transform = ''
      }
      setTimeout(() => {
        if (el && drag.current?.key !== d.key) el.style.transition = ''
        setActiveKey((key) => (key === d.key && !drag.current ? null : key))
      }, SETTLE_MS)
    }

    const start = (key, e) => {
      // 버튼(빼기)을 누른 경우와 마우스 오른쪽 버튼은 끌기가 아니다.
      if (drag.current || e.button > 0 || e.target.closest('button')) return
      const el = nodes.current.get(key)
      const grid = gridRef.current
      if (!el || !grid) return
      const g = grid.getBoundingClientRect()
      const touch = e.pointerType !== 'mouse'
      drag.current = {
        key,
        id: e.pointerId,
        touch,
        active: false,
        startX: e.clientX,
        startY: e.clientY,
        x: e.clientX,
        y: e.clientY,
        // 항목 안에서 잡은 위치
        dx: e.clientX - g.left - el.offsetLeft,
        dy: e.clientY - g.top - el.offsetTop,
        timer: touch ? setTimeout(activate, LONG_PRESS_MS) : null,
        raf: 0,
      }
      if (!touch) e.preventDefault() // 마우스로 끌 때 글자·그림이 선택되지 않게
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', end)
      window.addEventListener('pointercancel', end)
    }

    api.current = { snapshot, place, start, end }
  }

  // 끄는 동안에는 화면이 함께 스크롤되지 않게 한다. (터치 스크롤을 막으려면 passive 가 아닌 리스너여야 한다)
  useEffect(() => {
    const grid = gridRef.current
    if (!grid) return
    const onTouchMove = (e) => {
      if (drag.current?.active) e.preventDefault()
    }
    const onContextMenu = (e) => {
      if (drag.current) e.preventDefault() // 길게 눌렀을 때 뜨는 메뉴
    }
    grid.addEventListener('touchmove', onTouchMove, { passive: false })
    grid.addEventListener('contextmenu', onContextMenu)
    return () => {
      grid.removeEventListener('touchmove', onTouchMove)
      grid.removeEventListener('contextmenu', onContextMenu)
      api.current.end()
    }
  }, [])

  // 순서가 바뀌면: 자리가 달라진 항목들을 예전 자리에서 새 자리로 미끄러지게 한다.
  const order = keys.join('\n')
  useLayoutEffect(() => {
    const prev = before.current
    before.current = null
    if (prev) {
      const moved = []
      for (const [key, el] of nodes.current) {
        if (key === drag.current?.key) continue
        const from = prev.get(key)
        if (!from) continue
        const to = slot(el)
        if (from.left === to.left && from.top === to.top) continue
        el.style.transition = 'none'
        el.style.transform = `translate(${from.left - to.left}px, ${from.top - to.top}px)`
        moved.push(el)
      }
      if (moved.length) {
        gridRef.current?.getBoundingClientRect() // 위에서 정한 시작 위치를 먼저 반영시킨다
        for (const el of moved) {
          el.style.transition = SLIDE
          el.style.transform = ''
        }
      }
    }
    if (drag.current?.active) api.current.place() // 끌고 있는 항목은 자리가 바뀌어도 손가락 밑에 그대로 둔다
  }, [order])

  return {
    gridRef,
    activeKey,
    // 순서가 바뀌는 다른 동작(빼기·키보드 이동) 직전에 부르면 그 변화도 미끄러지듯 보인다.
    snapshot: api.current.snapshot,
    item: (key) => ({
      ref: (el) => {
        if (el) nodes.current.set(key, el)
        else nodes.current.delete(key)
      },
      onPointerDown: (e) => api.current.start(key, e),
    }),
  }
}
