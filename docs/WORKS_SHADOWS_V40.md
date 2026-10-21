# SyntheCore v40 — внешние тени Works

**Основа:** v39. **Дата:** 16.10.2026.

По согласованному замечанию отключены внешние тени всех шести карточек раздела «Наши работы».

- `css/works.css`: `.sc-work-frame { box-shadow: none; }` остаётся единственным правилом внешней тени; удалены правила для передней и последней карточек.
- `js/works.js`: удалён неиспользуемый после этого расчёт передней карточки `updateFrontCard` и переключение класса `sc-work-item--front`. GSAP-трансформации, sticky, scroll-сценарии и Lenis не менялись.
- Внутренняя стеклянная плашка `.sc-work-content` сохраняет свою тень, поскольку изменение касается **внешних теней карточек Works**. Эффекты Hero, навигации, блока аудиторий и услуг сохраняются.
- Пауза после шестой работы `--works-last-hold:12svh` и стык с услугами не менялись.

Проверки: `node scripts/verify-works-static.cjs`, `node scripts/verify-services-static.cjs`, `node scripts/check-project.cjs`, `node scripts/verify-works-shadow-v40.cjs`.

`verify-works-services-transition-v38.cjs` и `verify-works-services-transition-v39.cjs` проверяют историческую реализацию с внешней тенью и на v40 неприменимы. Для текущего состояния использовать новый тест v40.

После интеграции в Git рекомендуется визуально проверить scroll вниз/вверх, переход Works → Services, размеры desktop/mobile и режим уменьшенной анимации.
