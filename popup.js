document.addEventListener('DOMContentLoaded', () => {
  const hostInput = document.getElementById('hostInput');
  const saveBtn = document.getElementById('saveBtn');
  const statusText = document.getElementById('status');

  // 1. 팝업 열릴 때 기존 저장된 주소 불러오기
  chrome.storage.local.get({ customHost: 'b.redstar.moe' }, (result) => {
    hostInput.value = result.customHost;
  });

  // 2. 저장 버튼 클릭 시
  saveBtn.addEventListener('click', () => {
    let newHost = hostInput.value.trim();
    if (!newHost) newHost = 'b.redstar.moe';
    newHost = newHost.replace(/^https?:\/\//, '').replace(/\/$/, '');

    // 크롬 저장소에 저장
    chrome.storage.local.set({ customHost: newHost }, () => {
      hostInput.value = newHost;
      statusText.textContent = '저장 완료! (새로고침 시 적용)'; // 안내 문구 수정
      
      setTimeout(() => {
        statusText.textContent = '';
      }, 3000);
    });
  });
});