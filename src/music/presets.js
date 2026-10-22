// 기본 제공 배경음악. 저작권이 끝난 곡을 직접 편곡·합성했거나 이 프로젝트용으로 만든 곡이다.
// 파일은 public/audio/presets/ 에 있고, wedding.js 의 bgm 에 path 를 적으면 쓰인다.
export const BGM_PRESETS = [
  { id: 'canon', title: '캐논', credit: '파헬벨 · 피아노 편곡', mood: '잔잔하고 클래식한', duration: 96, path: 'audio/presets/canon.mp3' },
  { id: 'ode-to-joy', title: '환희의 송가', credit: '베토벤 · 오르골 편곡', mood: '밝고 경쾌한', duration: 83, path: 'audio/presets/ode-to-joy.mp3' },
  { id: 'music-box', title: '봄날 오르골', credit: '오리지널 · 왈츠', mood: '사랑스럽고 아기자기한', duration: 73, path: 'audio/presets/music-box.mp3' },
  { id: 'warm-piano', title: '따스한 피아노', credit: '오리지널 · 피아노', mood: '따뜻하고 서정적인', duration: 109, path: 'audio/presets/warm-piano.mp3' },
]

export const formatDuration = (sec) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`
