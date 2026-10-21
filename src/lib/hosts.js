// 신랑·신부를 설정의 표기 순서(hostOrder)대로 돌려준다. 화면마다 같은 순서를 쓰기 위해 한 곳에서 정한다.
export function orderedHosts(wedding) {
  const groom = { ...wedding.groom, side: 'groom', label: '신랑' }
  const bride = { ...wedding.bride, side: 'bride', label: '신부' }
  return wedding.hostOrder === 'bride-first' ? [bride, groom] : [groom, bride]
}

// 돌아가신 부모님은 이름 앞에 故 를 붙인다.
export function parentName(name, deceased) {
  return deceased ? `故 ${name}` : name
}
