import { useLayoutEffect } from 'react'
import { useWedding } from './lib/wedding-context.jsx'
import { themeOf } from './themes/index.js'
import { ensureThemeFonts } from './lib/theme-fonts.js'
import Cover from './components/Cover.jsx'
import Greeting from './components/Greeting.jsx'
import WeddingDate from './components/WeddingDate.jsx'
import Gallery from './components/Gallery.jsx'
import Location from './components/Location.jsx'
import Rsvp from './components/Rsvp.jsx'
import Account from './components/Account.jsx'
import Guestbook from './components/Guestbook.jsx'
import Share from './components/Share.jsx'
import BgmToggle from './components/BgmToggle.jsx'
import { Toaster } from './components/Toast.jsx'

export default function App() {
  const wedding = useWedding()
  const theme = themeOf(wedding.theme)

  // 템플릿 색은 <html data-theme> 기준이라 배경까지 함께 바뀐다. 미리보기에서 템플릿을 바꿀 때도 여기서 반영된다.
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme.id
    ensureThemeFonts(theme)
  }, [theme])

  return (
    <main className="page">
      <Cover />
      <Greeting />
      <WeddingDate />
      <Gallery />
      <Location />
      <Rsvp />
      <Account />
      <Guestbook />
      <Share />
      <BgmToggle src={wedding.bgm} />
      <Toaster />
    </main>
  )
}
