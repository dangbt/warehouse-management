const REPO_URL = 'https://github.com/dangbt/warehouse-management'

/**
 * Dòng ghi công AGPL NOTICE §7(b). Hằng số cứng — không lấy từ branding/API/settings,
 * không có prop/setting để ẩn.
 */
export function PoweredBy() {
  return (
    <p className="text-[11px] text-gray-400 text-center py-1 select-none" data-testid="powered-by">
      Powered by{' '}
      <a
        href={REPO_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:text-gray-500"
      >
        Kho Việt
      </a>
      {' — dangbt · v'}
      {__APP_VERSION__}
    </p>
  )
}
