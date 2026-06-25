chrome.storage.local.get({ customHost: 'b.redstar.moe' }, (result) => {
  const targetHost = result.customHost;

  // HTML 내의 요소들을 찾아 주소를 바꾸는 함수
  function replaceAllBppy() {
    // 1. 재생 버튼의 data-audio-url 속성 변경 및 로그 출력
    const buttons = document.querySelectorAll('button[data-audio-url*="b.ppy.sh"]');
    buttons.forEach(btn => {
      const oldUrl = btn.getAttribute('data-audio-url');
      const newUrl = oldUrl.replace('b.ppy.sh', targetHost);
      
      btn.setAttribute('data-audio-url', newUrl);
      
      // 요청하신 형식으로 풀 URL 로그 출력
      console.log(`[BanchoPreviewChanger|확장프로그램] (Audio) ${oldUrl} 주소를 ${newUrl} 로 변경 완료했습니다.`);
    });

    // 2. JSON 데이터가 들어있는 <script id="json-beatmapset"> 내부 텍스트 변경
    const jsonScript = document.getElementById('json-beatmapset');
    if (jsonScript && jsonScript.textContent.includes('b.ppy.sh')) {
      
      // JSON 내부에 있는 이스케이프 처리된 URL(예: https:\/\/b.ppy.sh\/preview...)을 정규식으로 추출
      const urlRegex = /https:\\\/\\\/b\.ppy\.sh[A-Za-z0-9\\\/\.\-\_]+/g;
      const matchedUrls = jsonScript.textContent.match(urlRegex);
      
      // 추출된 URL이 있다면 로그에 출력
      if (matchedUrls) {
        matchedUrls.forEach(oldUrlEscaped => {
          const newUrlEscaped = oldUrlEscaped.replace('b.ppy.sh', targetHost);
          
          // 로그 가독성을 위해 보기 싫은 역슬래시(\/)를 일반 슬래시(/)로 변환
          const cleanOld = oldUrlEscaped.replace(/\\\//g, '/');
          const cleanNew = newUrlEscaped.replace(/\\\//g, '/');
          
          console.log(`[BanchoPreviewChanger|확장프로그램] (JSON) ${cleanOld} 주소를 ${cleanNew} 로 변경 완료했습니다.`);
        });
      }

      // 실제 JSON 데이터 치환 적용
      jsonScript.textContent = jsonScript.textContent.replace(/b\.ppy\.sh/g, targetHost);
    }
  }

  // 스크립트가 실행되자마자 즉시 1회 실행
  replaceAllBppy();

  // 오스 웹페이지는 새로고침 없이 화면이 넘어가므로 (SPA 방식)
  // 화면의 구조가 변할 때마다 스크립트가 계속 추적해서 바꿔주도록 설정
  const observer = new MutationObserver(() => {
    replaceAllBppy();
  });

  // body뿐만 아니라 script 태그가 있을 수 있는 document 전체(head 포함)를 감시
  observer.observe(document.documentElement, { childList: true, subtree: true });
});