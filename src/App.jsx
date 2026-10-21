import { useWedding } from './lib/wedding-context.jsx'
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
