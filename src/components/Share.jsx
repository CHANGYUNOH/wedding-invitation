import { wedding } from '../config/wedding.js'
import { hasKakaoKey, getKakao } from '../lib/kakao.js'
import { copyText } from '../lib/clipboard.js'
import { asset } from '../lib/asset.js'
import Reveal from './Reveal.jsx'
import { toast } from './Toast.jsx'
import './Share.css'

const pageUrl = () => window.location.origin + window.location.pathname

export default function Share() {
  const shareKakao = async () => {
    if (!hasKakaoKey) {
      toast('카카오 JavaScript 키(VITE_KAKAO_JS_KEY)를 설정해주세요.')
      return
    }
    try {
      const Kakao = await getKakao()
      const url = pageUrl()
      const { title, description, image } = wedding.share
      const imageUrl = new URL(asset(image), window.location.href).href
      Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title,
          description,
          imageUrl,
          link: { mobileWebUrl: url, webUrl: url },
        },
        buttons: [{ title: '모바일 청첩장 보기', link: { mobileWebUrl: url, webUrl: url } }],
      })
    } catch (err) {
      console.error(err)
      toast('카카오톡 공유를 실행하지 못했습니다.')
    }
  }

  const copyLink = async () => {
    const ok = await copyText(pageUrl())
    toast(ok ? '청첩장 주소가 복사되었습니다.' : '복사하지 못했습니다.')
  }

  return (
    <footer className="share">
      <Reveal className="share__buttons">
        <button type="button" className="btn btn--block share__kakao" onClick={shareKakao}>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path
              fill="currentColor"
              d="M12 3C6.48 3 2 6.58 2 11c0 2.83 1.84 5.31 4.6 6.74l-.93 3.44c-.08.3.26.54.52.37l4.1-2.72c.56.07 1.13.11 1.71.11 5.52 0 10-3.58 10-8S17.52 3 12 3z"
            />
          </svg>
          카카오톡으로 공유하기
        </button>
        <button type="button" className="btn btn--block" onClick={copyLink}>
          청첩장 주소 복사하기
        </button>
      </Reveal>
      <p className="share__thanks">Thank you for celebrating with us</p>
    </footer>
  )
}
