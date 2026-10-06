const KAKAO_JS_KEY = import.meta.env.VITE_KAKAO_JS_KEY

// 버전을 올릴 때는 https://developers.kakao.com/docs/ko/javascript/download 의 SRI 해시도 함께 바꿔주세요.
const KAKAO_SDK = {
  src: 'https://t1.kakaocdn.net/kakao_js_sdk/2.8.3/kakao.min.js',
  integrity: 'sha384-oroumrnFVE0xtgqyDZJARgERibXg2C28380uaUZz2kHDS5CR7tu20eGiOU6GkTpy',
}

export const hasKakaoKey = Boolean(KAKAO_JS_KEY)

const scripts = new Map()

function loadScript(src, integrity) {
  if (!scripts.has(src)) {
    scripts.set(
      src,
      new Promise((resolve, reject) => {
        const el = document.createElement('script')
        el.src = src
        el.async = true
        if (integrity) {
          el.integrity = integrity
          el.crossOrigin = 'anonymous'
        }
        el.onload = resolve
        el.onerror = () => {
          scripts.delete(src)
          reject(new Error(`스크립트를 불러오지 못했습니다: ${src}`))
        }
        document.head.appendChild(el)
      }),
    )
  }
  return scripts.get(src)
}

// 카카오톡 공유용 SDK
export async function getKakao() {
  await loadScript(KAKAO_SDK.src, KAKAO_SDK.integrity)
  if (!window.Kakao.isInitialized()) window.Kakao.init(KAKAO_JS_KEY)
  return window.Kakao
}

// 카카오맵 SDK (카카오 디벨로퍼스에서 '카카오맵' 사용 설정 필요)
export async function getKakaoMaps() {
  await loadScript(`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&autoload=false`)
  await new Promise((resolve) => window.kakao.maps.load(resolve))
  return window.kakao.maps
}
