# Brick Throw Demo

브라우저에서 바로 플레이할 수 있는 정적 3D 데모입니다.

## Local

```bash
npm install
npm run dev
```

## GitHub Pages 배포

이 저장소에는 GitHub Pages 자동 배포 워크플로가 포함되어 있습니다.

1. GitHub에 새 저장소를 만듭니다.
2. 이 프로젝트를 원격 저장소에 푸시합니다.
3. GitHub 저장소의 `Settings > Pages`에서 배포 방식이 `GitHub Actions`인지 확인합니다.
4. `main` 또는 `master` 브랜치에 푸시하면 Actions가 `dist/`를 자동 배포합니다.
5. 배포가 끝나면 다음 주소로 접속할 수 있습니다.

```text
https://<github-username>.github.io/<repo-name>/
```

현재 Vite 설정은 상대 경로 기반이라서 GitHub Pages의 저장소 하위 경로에서도 동작하도록 맞춰져 있습니다.
