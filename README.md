# 모바일 청첩장

Vite + React로 만든 모바일 청첩장입니다. 정적 사이트로 빌드되며, RSVP·방명록은 Supabase에 저장합니다.

## 구성

| 섹션 | 내용 |
| --- | --- |
| 커버 | 날짜, 메인 사진, 신랑·신부 이름, 일시·장소 |
| 인사말 | 초대 문구, 혼주 성함 |
| 예식 일시 | 달력, 실시간 카운트다운, D-day 문구 |
| 갤러리 | 3열 썸네일(9장 이후 더보기), 스와이프 가능한 전체화면 뷰어 |
| 오시는 길 | 지도(카카오맵, 키가 없으면 OpenStreetMap), 네이버지도·카카오맵·티맵 길찾기, 주소 복사, 교통편 |
| 참석 의사 전달 | 신랑/신부측, 참석 여부, 인원, 식사 여부 |
| 마음 전하실 곳 | 신랑측·신부측 계좌 접이식 목록, 복사 버튼, 카카오페이 링크(선택) |
| 방명록 | 작성·더보기·비밀번호로 삭제 |
| 공유 | 카카오톡 공유, 주소 복사 |
| 배경음악 | 우측 상단 재생/정지 버튼 |

## 시작하기

```bash
npm install
npm run dev      # http://localhost:5173 (같은 와이파이의 휴대폰에서도 접속 가능)
npm run build    # dist/ 에 정적 파일 생성
npm run preview  # 빌드 결과 미리보기
```

`.env` 없이도 바로 실행됩니다. 이때 RSVP·방명록은 브라우저 localStorage에 저장되는 **로컬 모드**로 동작하니, 실제 배포 전에는 아래 Supabase 설정을 해주세요.

## 내용 수정

모든 문구와 정보는 [src/config/wedding.js](src/config/wedding.js) 한 파일에서 수정합니다.

- **사진**: `public/images/` 아래 파일을 교체하고 `cover.image`, `gallery` 경로를 맞춰주세요. 지금 들어 있는 SVG는 자리표시용입니다.
- **배경음악**: `public/audio/bgm.mp3`처럼 파일을 넣고 `bgm: 'audio/bgm.mp3'`로 지정합니다. 비워두면 버튼이 숨겨집니다. 모바일 브라우저는 자동재생을 막기 때문에 하객이 버튼을 눌러야 재생됩니다.
- **지도 좌표**: 카카오맵에서 장소를 검색한 뒤 우클릭 → "여기 좌표 보기"로 위도(`lat`)·경도(`lng`)를 확인할 수 있습니다.
- **공유 미리보기**: `share.image`(기본 `public/images/og.png`)가 카카오톡 공유 카드 이미지입니다. JPG/PNG, 5MB 이하, 가로 800px 이상을 권장하며 SVG는 표시되지 않습니다. `share.siteUrl`에는 배포 주소를 적어주세요. 주소를 카톡방에 직접 붙여넣었을 때의 미리보기에 쓰입니다.

색상·폰트는 [src/styles/global.css](src/styles/global.css) 상단의 CSS 변수에서 바꿀 수 있습니다.

## Supabase 설정 (RSVP·방명록)

1. [supabase.com](https://supabase.com)에서 프로젝트를 만듭니다 (무료 플랜으로 충분).
2. **SQL Editor**에 [supabase/schema.sql](supabase/schema.sql) 내용을 붙여넣고 실행합니다.
3. **Project Settings → API**에서 Project URL과 `anon` public 키를 복사해 `.env`에 넣습니다.

```bash
cp .env.example .env
```

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

- RSVP 응답은 하객이 조회할 수 없고, Supabase 대시보드 **Table Editor → rsvp**에서만 볼 수 있습니다 (CSV 내보내기 가능).
- 방명록 비밀번호는 서버에서 bcrypt로 해시해 저장하며, 브라우저로는 내려가지 않습니다.
- 무료 플랜 프로젝트는 일주일간 요청이 없으면 일시 정지되니, 청첩장을 돌리는 기간에는 대시보드를 가끔 확인해주세요.

## 카카오 설정 (공유·지도)

1. [카카오 디벨로퍼스](https://developers.kakao.com/console/app)에서 앱을 만듭니다.
2. **앱 → 플랫폼 키 → JavaScript 키**를 복사해 `.env`의 `VITE_KAKAO_JS_KEY`에 넣습니다.
3. 같은 화면의 **JavaScript SDK 도메인**에 청첩장을 여는 주소를 등록합니다. SDK가 이 도메인에서만 동작합니다.
   - 개발용 `http://localhost:5173`, 휴대폰으로 테스트한다면 `http://192.168.x.x:5173`
   - 배포 주소 (예: `https://our-wedding.vercel.app`)
4. **앱 → 제품 링크 관리 → 웹 도메인**에 배포 주소를 등록합니다. 여기 등록되지 않으면 공유 메시지의 버튼을 눌러도 청첩장이 열리지 않습니다.
5. 지도를 쓰려면 **카카오맵** 사용 설정을 켭니다. 꺼져 있거나 키가 없으면 OpenStreetMap으로 대체됩니다.

카카오 서버가 공유 이미지를 직접 내려받기 때문에 `localhost`에서 공유하면 카드에 이미지가 빠집니다. 이미지까지 확인하려면 배포한 뒤 테스트하세요.

## 배포

`npm run build` 결과인 `dist/` 폴더를 정적 호스팅에 올리면 됩니다. 상대 경로로 빌드되므로 하위 경로에서도 동작합니다.

- **Vercel / Netlify**: 저장소를 연결하고 Build command `npm run build`, Output `dist`. 환경 변수 3개를 대시보드에 등록합니다.
- **GitHub Pages**: Actions로 `dist/`를 배포합니다. 환경 변수는 저장소 Secrets로 넘겨주세요.

배포 후에는 카카오 디벨로퍼스 Web 플랫폼에 실제 도메인을 꼭 추가하고, `share.siteUrl`·`share.imageUrl`도 실제 주소로 바꿔주세요.
