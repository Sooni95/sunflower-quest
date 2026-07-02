// 터치/마우스를 pointerdown 계열 이벤트로 통합 처리한다.
export function onTap(element, handler) {
  element.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    handler(event);
  });
}
