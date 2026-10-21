import { createContext, useContext } from 'react'

// 청첩장 화면은 이 context로 설정을 받는다.
// 하객용 페이지는 src/config/wedding.js 를, 편집 페이지의 미리보기는 입력 중인 내용을 넘겨준다.
const WeddingContext = createContext({ wedding: null, preview: false })

export function WeddingProvider({ wedding, preview = false, children }) {
  return <WeddingContext.Provider value={{ wedding, preview }}>{children}</WeddingContext.Provider>
}

export const useWedding = () => useContext(WeddingContext).wedding

// 미리보기에서는 방명록·참석 의사·공유가 실제로 전송되지 않는다.
export const usePreview = () => useContext(WeddingContext).preview
