// 청첩장의 모든 문구·정보는 이 파일에서 수정합니다.
// 정보 입력 페이지(/edit)에서 2026. 11. 20. 오전 1:48에 내보낸 파일입니다.
// 이미지·음악 경로는 public/ 폴더 기준 상대 경로입니다.
// 커버·갤러리 사진은 photos/ 폴더에 원본을 넣으면 자동으로 줄여서 들어갑니다 (README 참고).
// 이름·계좌는 샘플입니다. 실제 값은 git에 올리지 않는 wedding.private.json(또는 Vercel 환경변수
// WEDDING_PRIVATE)에 적으면 빌드할 때 이 파일 위에 덮어씁니다 (README "실명·계좌번호 따로 두기" 참고).
import { photos } from './photos.generated.js'

export const wedding = {
  // 디자인 템플릿: 'minimal'(미니멀 화이트), 'floral'(로맨틱 플로럴), 'dark'(모던 나이트), 'modern'(볼드 타이포), 'hanok'(전통 한지), 'garden'(보태니컬 가든), 'lavender'(파스텔 라벤더), 'film'(레트로 필름), 'magazine'(에디토리얼 매거진), 'clean'(클린 포토)
  theme: 'minimal',
  // 이름 표기 순서: 'groom-first'(신랑 먼저) 또는 'bride-first'(신부 먼저)
  hostOrder: 'groom-first',
  // 돌아가신 부모님은 fatherDeceased·motherDeceased 를 true 로 두면 이름 앞에 故 가 붙습니다.
  groom: {
    name: '김민준',
    shortName: '민준',
    father: '김영수',
    fatherDeceased: false,
    mother: '정미경',
    motherDeceased: false,
    relation: '차남',
  },
  bride: {
    name: '이서연',
    shortName: '서연',
    father: '이정호',
    fatherDeceased: false,
    mother: '박지은',
    motherDeceased: false,
    relation: '장녀',
  },

  // 한국 시간(+09:00) 기준으로 적어주세요.
  datetime: '2027-04-24T15:00:00+09:00',

  venue: {
    name: '아만티호텔서울 웨딩',
    hall: '2층',
    address: '서울 마포구 월드컵북로 31',
    tel: '02-332-0158',
    lat: 37.55713946226895,
    lng: 126.91870574516105,
    naverMapUrl: '',
    transport: [
      {
        title: '지하철/버스',
        lines: ['- 2호선/공항철도/경의중앙선 홍대입구역 1번 출구에서 510m', '- 홍대입구역(중) 혹은 서교동(중) 하차'],
      },
      {
        title: '셔틀버스',
        lines: [
          '- 홍대입구 1번 출구 옆 하나은행코너 앞 승차',
          '- 배차간격: 10~15분',
          '- 13:45~15:00 사이 운행',
          '- 예식 후 1시간 운행',
          '- 아만티호텔 정문 앞 승하차',
        ],
      },
      {
        title: '자가용',
        lines: ['- 주소: 서울 마포구 서교동 447-1', '- 2시간 무료, 지하 2~5층 주차 가능'],
      },
    ],
  },

  cover: {
    image: photos.cover ?? 'images/cover.svg',
    caption: 'WE ARE GETTING MARRIED',
  },

  greeting: {
    title: '함께하는 첫 날, 함께 해주세요',
    message: [
      '서로에게 가장 든든하고',
      '다정한 편이 되어',
      '기쁠 때나 힘들 때나',
      '서로를 꼭 안아주는',
      '다정한 부부가 되려 합니다.',
      '',
      '저희 두 사람의 시작을',
      '소중한 분들과 함께하고 싶습니다.',
      '귀한 걸음으로 함께해 주시어',
      '행복한 순간을 축복해 주세요.',
    ],
  },

  // photos/gallery/ 의 사진이 파일 이름순으로 들어갑니다.
  gallery: photos.gallery,

  // kakaopay: 카카오페이 송금 링크가 있으면 버튼이 함께 표시됩니다.
  accounts: {
    groom: [
      { role: '신랑', name: '김민준', bank: '국민은행', number: '000-00-000000-0', kakaopay: '' },
      { role: '아버지', name: '김영수', bank: '신한은행', number: '000-000-000000', kakaopay: '' },
      { role: '어머니', name: '정미경', bank: '우리은행', number: '0000-000-000000', kakaopay: '' },
    ],
    bride: [{ role: '신부', name: '이서연', bank: '하나은행', number: '000-000000-00000', kakaopay: '' }],
  },

  // 배경음악: 기본 제공 곡('audio/presets/canon.mp3', 'audio/presets/ode-to-joy.mp3', 'audio/presets/music-box.mp3', 'audio/presets/warm-piano.mp3')이나
  // public/audio/ 에 넣은 파일의 경로를 적어주세요. 비워두면 음악 버튼이 숨겨집니다.
  bgm: 'audio/bgm.mp3',

  // image: 공유 카드 이미지 (JPG/PNG). 바꾸면 ?v= 뒤 숫자를 올려주세요.
  // siteUrl: 배포한 청첩장 주소. 링크를 카톡방에 직접 붙여넣었을 때의 미리보기에 쓰입니다.
  share: {
    title: '김민준♥️이서연 결혼합니다',
    description: '2027년 4월 24일 토요일 오후 3시, 아만티호텔서울 웨딩 2층',
    image: 'images/og.jpg?v=1',
    siteUrl: 'https://wedding-card-invitation-mobile.vercel.app',
  },
}
