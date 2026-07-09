chrome.storage.local.get({ customHost: 'b.redstar.moe' }, (result) => {
  const targetHost = result.customHost;

  // 1. 입력된 주소를 모두 소문자로 변환
  const lowerHost = targetHost.toLowerCase();

  // 2. 본섭 주소이거나 'bancho'가 포함된 경우 실행 중단 (무한 루프 방지)
  if (lowerHost.includes('b.ppy.sh') || lowerHost.includes('bancho')) {
    console.log(`[BanchoPreviewChanger|확장프로그램] 입력된 주소(${targetHost})가 Bancho의 주소이므로 변경 작업을 생략합니다.`);
    return; 
  }

  // 백그라운드 음원 미리 불러오기 함수
  function prefetchAudio(url) {
    fetch(url)
      .then((response) => {
        if (response.ok) {
          console.log(`[BanchoPreviewChanger|확장프로그램] 서버에서 음원을 미리 가져와 캐시에 저장했습니다: ${url}`);
        }
      })
      .catch((err) => console.error(`[BanchoPreviewChanger|확장프로그램] 요청 실패: ${url}`, err));
  }

  // HTML 내의 요소들을 찾아 주소를 바꾸는 핵심 함수
  function replaceAllBppy() {
    // 1. 재생 버튼의 data-audio-url 속성 변경
    const buttons = document.querySelectorAll('button[data-audio-url*="b.ppy.sh"]');
    buttons.forEach(btn => {
      const oldUrl = btn.getAttribute('data-audio-url');
      const newUrl = oldUrl.replace('b.ppy.sh', targetHost);

      btn.setAttribute('data-audio-url', newUrl);
      console.log(`[BanchoPreviewChanger|확장프로그램] (Audio) ${oldUrl} 주소를 ${newUrl} 로 변경 완료했습니다.`);

      // 변경 직후 해당 주소로 미리 요청 보내기
      prefetchAudio(newUrl);
    });

    // 2. JSON 데이터가 들어있는 <script> 내부 텍스트 변경
    // 개별 비트맵 페이지('json-beatmapset') 및 검색/목록 페이지('json-beatmaps') 모두 대응
    const jsonScriptIds = ['json-beatmapset', 'json-beatmaps'];
    
    jsonScriptIds.forEach(id => {
      const jsonScript = document.getElementById(id);
      if (jsonScript && jsonScript.textContent.includes('b.ppy.sh')) {

        // URL 추출 정규식
        const urlRegex = /https:\\\/\\\/b\.ppy\.sh[A-Za-z0-9\\/\.\-\_]+/g;
        const matchedUrls = jsonScript.textContent.match(urlRegex);

        if (matchedUrls) {
          let newText = jsonScript.textContent;

          matchedUrls.forEach(oldUrlEscaped => {
            const newUrlEscaped = oldUrlEscaped.replace('b.ppy.sh', targetHost);

            const cleanOld = oldUrlEscaped.replace(/\\\//g, '/');
            const cleanNew = newUrlEscaped.replace(/\\\//g, '/');

            console.log(`[BanchoPreviewChanger|확장프로그램] (JSON - ${id}) ${cleanOld} 주소를 ${cleanNew} 로 변경 완료했습니다.`);

            // JSON 내부에서 찾은 URL도 미리 요청 보내기
            prefetchAudio(cleanNew);

            // 텍스트 치환
            newText = newText.replace(oldUrlEscaped, newUrlEscaped);
          });
          
          // 변경된 텍스트를 다시 DOM에 적용
          jsonScript.textContent = newText;
        }
      }
    });
  }

  // 1. 스크립트 로드 시 최초 1회 실행
  replaceAllBppy();

  // 2. 스크롤을 내리거나 페이지 변경으로 인해 새로 생겨나는 버튼에 대응 (DOM 변화 감지)
  const observer = new MutationObserver((mutations) => {
    // 성능을 위해 추가된 노드가 있을 때만 함수 실행
    let hasNewNodes = false;
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0 || mutation.type === 'attributes') {
        hasNewNodes = true;
        break;
      }
    }
    
    if (hasNewNodes) {
      replaceAllBppy();
    }
  });

  // body 태그 내의 모든 자식 요소와 속성 변화를 실시간으로 감시
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true, 
    attributeFilter: ['data-audio-url'] 
  });

});