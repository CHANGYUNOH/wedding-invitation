// 청첩장의 모든 문구·정보는 이 파일에서 수정합니다.
// 이미지·음악 경로는 public/ 폴더 기준 상대 경로입니다.
// 커버·갤러리 사진은 photos/ 폴더에 원본을 넣으면 자동으로 줄여서 들어갑니다 (README 참고).
import { photos } from './photos.generated.js'

export const wedding = {
  // 디자인 템플릿: 'minimal'(미니멀 화이트), 'floral'(로맨틱 플로럴), 'dark'(모던 나이트), 'modern'(볼드 타이포),
  //   'hanok'(전통 한지), 'garden'(보태니컬 가든), 'lavender'(파스텔 라벤더), 'film'(레트로 필름), 'magazine'(에디토리얼 매거진)
  theme: 'minimal',
  // 이름 표기 순서: 'groom-first'(신랑 먼저) 또는 'bride-first'(신부 먼저)
  hostOrder: 'groom-first',
  // 돌아가신 부모님은 fatherDeceased·motherDeceased 를 true 로 두면 이름 앞에 故 가 붙습니다.
  groom: {
    name: '노찬규',
    shortName: '찬규',
    father: '노충섭',
    fatherDeceased: false,
    mother: '박은주',
    motherDeceased: false,
    relation: '아들',
  },
  bride: {
    name: '조수경',
    shortName: '수경',
    father: '아빠',
    fatherDeceased: false,
    mother: '엄마',
    motherDeceased: false,
    relation: '딸',
  },

  // 한국 시간(+09:00) 기준으로 적어주세요.
  datetime: '2027-04-17T12:30:00+09:00',

  venue: {
    name: '더세인트',
    hall: '6층 그랜드볼룸',
    address: '서울 구로구 경인로 662 디큐브시티',
    tel: '02-2211-2400',
    lat: 37.5088408,
    lng: 126.8899694,
    // '네이버지도' 버튼이 이 장소 페이지로 바로 열립니다. 비워두면 장소 이름으로 검색합니다.
    naverMapUrl: 'https://naver.me/xExWm05A',
    transport: [
      {
        title: '지하철',
        lines: ['1·2호선 신도림역 1번 출구 도보 1분', 'B1층 GS편의점 오른쪽 오피스2 입구로 들어오세요.'],
      },
      {
        title: '버스',
        lines: [
          '지선 5615, 5714, 6512, 6513, 6515, 6516, 6637, 6640B',
          '간선 160, 503, 600, 660, 662',
          '직행 301, 320 / 일반 10, 11-1, 11-2, 530, 83, 88',
        ],
      },
      {
        title: '자가용',
        lines: ['디큐브시티 오피스동 주차장 입구로 들어와', '기둥번호 6~8번 구역에 주차해주세요. (무료 주차)'],
      },
    ],
  },

  cover: {
    image: photos.cover ?? 'images/cover.svg',
    caption: 'WE ARE GETTING MARRIED',
  },

  greeting: {
    title: '초대합니다',
    message: [
      '서로가 마주보며 다져온 사랑을',
      '이제 함께 한 곳을 바라보며',
      '걸어갈 수 있는 큰 사랑으로 키우고자 합니다.',
      '',
      '저희 두 사람이 사랑의 이름으로',
      '지켜나갈 수 있게 앞날을 축복해 주시면',
      '감사하겠습니다.',
    ],
  },

  // photos/gallery/ 의 사진이 파일 이름순으로 들어갑니다.
  gallery: photos.gallery,

  accounts: {
    groom: [
      { role: '신랑', name: '노찬규', bank: '부산은행', number: '175-12-000025-9' },
      { role: '아버지', name: '노충섭', bank: '신한은행', number: '000-000-000000' },
      { role: '어머니', name: '박은주', bank: '우리은행', number: '0000-000-000000' },
    ],
    bride: [
      // kakaopay: 카카오페이 송금 링크가 있으면 버튼이 함께 표시됩니다.
      { role: '신부', name: '조수경', bank: '하나은행', number: '000-000000-00000', kakaopay: '' },
      { role: '아버지', name: '이정호', bank: '농협', number: '000-0000-0000-00' },
      { role: '어머니', name: '박지은', bank: '기업은행', number: '000-000000-00-000' },
    ],
  },

  // 배경음악: 기본 제공 곡('audio/presets/canon.mp3', 'ode-to-joy.mp3', 'music-box.mp3', 'warm-piano.mp3')이나
  // public/audio/ 에 넣은 파일의 경로를 적어주세요. 비워두면 음악 버튼이 숨겨집니다.
  bgm: '',

  share: {
    title: '노찬규 ♥ 조수경 결혼합니다',
    description: '2027년 4월 17일 토요일 낮 12시 30분, 더세인트 6층 그랜드볼룸',
    // 공유 카드 이미지 (JPG/PNG, 5MB 이하, 가로 800px 이상 권장). SVG는 카카오톡에서 표시되지 않습니다.
    // 카카오톡은 같은 주소의 이미지를 한동안 저장해두므로, 이미지를 바꾸면 ?v= 뒤 숫자를 올려주세요.
    image: 'images/og.png?v=2',
    // 배포한 청첩장 주소. 링크를 카톡방에 직접 붙여넣었을 때의 미리보기(og 태그)에 쓰입니다.
    siteUrl: 'https://wedding-invitation-1qfiuts4c-changyu.vercel.app/',
  },
}
