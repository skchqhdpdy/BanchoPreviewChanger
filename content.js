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

  // 미리듣기 오디오 URL 치환 함수
  function replaceAllBppy() {
    // 1. 재생 버튼의 data-audio-url 속성 변경
    const buttons = document.querySelectorAll('button[data-audio-url*="b.ppy.sh"]');
    buttons.forEach(btn => {
      const oldUrl = btn.getAttribute('data-audio-url');
      const newUrl = oldUrl.replace('b.ppy.sh', targetHost);

      btn.setAttribute('data-audio-url', newUrl);
      console.log(`[BanchoPreviewChanger|확장프로그램] (Audio) ${oldUrl} 주소를 ${newUrl} 로 변경 완료했습니다.`);

      prefetchAudio(newUrl);
    });

    // 2. JSON 데이터 변경
    const jsonScriptIds = ['json-beatmapset', 'json-beatmaps'];
    
    jsonScriptIds.forEach(id => {
      const jsonScript = document.getElementById(id);
      if (jsonScript && jsonScript.textContent.includes('b.ppy.sh')) {

        const urlRegex = /https:\\\/\\\/b\.ppy\.sh[A-Za-z0-9\\/\.\-\_]+/g;
        const matchedUrls = jsonScript.textContent.match(urlRegex);

        if (matchedUrls) {
          let newText = jsonScript.textContent;

          matchedUrls.forEach(oldUrlEscaped => {
            const newUrlEscaped = oldUrlEscaped.replace('b.ppy.sh', targetHost);
            const cleanOld = oldUrlEscaped.replace(/\\\//g, '/');
            const cleanNew = newUrlEscaped.replace(/\\\//g, '/');

            console.log(`[BanchoPreviewChanger|확장프로그램] (JSON - ${id}) ${cleanOld} 주소를 ${cleanNew} 로 변경 완료했습니다.`);

            prefetchAudio(cleanNew);

            newText = newText.replace(oldUrlEscaped, newUrlEscaped);
          });
          
          jsonScript.textContent = newText;
        }
      }
    });
  }

  // 🌟 새롭게 추가된 osu!direct 가로채기 함수
  function fixOsuDirectButton() {
    // 버튼 요소들 찾기
    const directBtns = document.querySelectorAll('a.btn-osu-big--beatmapset-header');
    
    directBtns.forEach(btn => {
      // 텍스트가 'osu!direct'인 버튼만 타겟팅
      if (btn.textContent.includes('osu!direct')) {
        let bid = null;
        
        // 1. 활성화된 난이도 아이콘(DOM)에서 bid 추출 (예: href="#osu/1831285")
        const activeDiff = document.querySelector('.beatmapset-beatmap-picker__beatmap--active');
        if (activeDiff) {
          const hrefMatch = activeDiff.getAttribute('href').match(/#(?:.*\/)?([0-9]+)/);
          if (hrefMatch && hrefMatch[1]) {
            bid = hrefMatch[1];
          }
        }
        
        // 2. 만약 활성 아이콘을 못 찾았다면, 현재 브라우저 URL의 Hash에서 추출
        if (!bid) {
          const hashMatch = window.location.hash.match(/#(?:.*\/)?([0-9]+)/);
          if (hashMatch && hashMatch[1]) {
            bid = hashMatch[1];
          }
        }

        // bid를 찾았다면 주소를 치환
        if (bid) {
          const newHref = `osu://b/${bid}`;
          
          // 이미 바뀐 상태면 무시 (무한루프 방지)
          if (btn.getAttribute('href') !== newHref) {
            btn.setAttribute('href', newHref);
            
            // React의 내부 라우팅 동작이 가로채서 기부 페이지로 강제 이동하는 것을 방지
            btn.onclick = (e) => e.stopPropagation(); 
            
            console.log(`[BanchoPreviewChanger|확장프로그램] osu!direct 링크를 ${newHref} 로 변경 완료했습니다.`);
          }
        }
      }
    });
  }

  // 두 가지 변경 작업을 한 번에 실행하는 함수
  function runAllModifiers() {
    replaceAllBppy();
    fixOsuDirectButton();
  }

  // 1. 스크립트 로드 시 최초 1회 실행
  runAllModifiers();

  // 2. 난이도를 변경할 때 URL의 Hash(#)가 바뀌는 것을 감지하여 버튼 주소 즉시 갱신
  window.addEventListener('hashchange', () => {
    // React가 DOM을 그릴 시간을 살짝 주기 위해 타이머 사용
    setTimeout(fixOsuDirectButton, 50);
  });

  // 3. 스크롤 및 동적 페이지 로딩 대응 (DOM 변화 감지)
  const observer = new MutationObserver((mutations) => {
    let shouldRun = false;
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0 || mutation.type === 'attributes') {
        shouldRun = true;
        break;
      }
    }
    
    if (shouldRun) {
      runAllModifiers();
    }
  });

  // 이제 전체 HTML 문서를 감시하며 href, class(난이도 전환) 속성 변화까지 잡아냅니다.
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true, 
    attributeFilter: ['data-audio-url', 'href', 'class'] 
  });

});