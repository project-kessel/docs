import type { APIContext } from 'astro';
import type { MarkdownHeading } from 'astro';
import type { ClientPackage } from '../schemas/client-package';
import { generatePackageHeadings } from '../components/ClientPackageDescription.astro';

// TOC generation logic based on Starlight's generateToC function
// We'd use the real thing but it's not exported.
interface TocItem extends MarkdownHeading {
  children: TocItem[];
}

function injectChild(items: TocItem[], item: TocItem): void {
  const lastItem = items.at(-1);
  if (!lastItem || lastItem.depth >= item.depth) {
    items.push(item);
  } else {
    return injectChild(lastItem.children, item);
  }
}

function generateToC(headings: MarkdownHeading[], title: string, minHeadingLevel: number, maxHeadingLevel: number) {
  const filteredHeadings = headings.filter(({ depth }) => depth >= minHeadingLevel && depth <= maxHeadingLevel);
  // Include the top-level "Overview" heading
  const toc: Array<TocItem> = [{ depth: 2, slug: '_top', text: 'Overview', children: [] }];
  for (const heading of filteredHeadings) {
    injectChild(toc, { ...heading, children: [] });
  }
  return toc;
}

/**
 * Middleware to generate table of contents headings for client-package pages.
 * This augments the default markdown headings with structured headings based on
 * the ClientPackageDescription component's output.
 */
export async function clientPackageTocMiddleware(
  context: APIContext,
  next: () => Promise<void>
) {
  await next();

  const { starlightRoute } = context.locals;
  const frontmatter = starlightRoute?.entry?.data;


  // Only modify TOC for client-package docType
  if (frontmatter?.docType !== 'client-package' || !frontmatter.package) {
    return;
  }

  const pkg = frontmatter.package as ClientPackage;

  // Generate headings using component functions
  // This makes it easier to keep heading generation logic in sync with the component.
  const packageHeadings = generatePackageHeadings(pkg);

  // Combine existing headings (from markdown content) with package headings
  const existingHeadings = starlightRoute.headings || [];
  const combinedHeadings = [...existingHeadings, ...packageHeadings];

  // Update the headings in the route data with combined headings
  starlightRoute.headings = combinedHeadings;

  // Regenerate the TOC with the combined headings
  if (starlightRoute.toc && combinedHeadings.length > 0) {
    const title = frontmatter.title;
    const newToc = generateToC(
      combinedHeadings,
      title,
      starlightRoute.toc.minHeadingLevel,
      starlightRoute.toc.maxHeadingLevel
    );

    starlightRoute.toc = {
      ...starlightRoute.toc,
      items: newToc
    };
  }
}

export const onRequest = clientPackageTocMiddleware; 
