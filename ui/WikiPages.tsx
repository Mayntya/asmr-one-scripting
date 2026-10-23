import { HStack, Image, NavigationLink, Rectangle, ScrollView, Spacer, Text, VStack, useEffect, useState } from "scripting"
import type { Work } from "../lib/api"
import { searchWorks } from "../lib/api"
import { fetchCollection, fetchCollections } from "../lib/wiki"
import type { WikiCollection, WikiCollectionDetail, WikiPick } from "../lib/wiki"
import { glass, shape, usePalette } from "../lib/theme"
import { WorkDetail } from "./WorkDetail"

/** RJ → asmr.one 的作品对象。找不到就返回 null，行照样显示，只是点不进去。 */
async function resolve(rj: string): Promise<Work | null> {
  const want = String(parseInt(rj.replace(/^RJ/i, ""), 10))
  try {
    const r = await searchWorks(rj, 1, "release", 8)
    return r.works.find((w) => String(w.id) === want) ?? null
  } catch {
    return null
  }
}

function Cover({ work, T }: { work: Work | null | undefined; T: ReturnType<typeof usePalette> }) {
  const src = work == null ? "" : work.cover || work.thumb
  if (src.length === 0) return <Rectangle fill={T.rowBgHi} frame={{ width: 58, height: 58 }} clipShape={shape(12)} />
  return (
    <Image
      imageUrl={src}
      resizable
      scaleToFill
      aspectRatio={{ value: 1, contentMode: "fill" }}
      frame={{ width: 58, height: 58 }}
      mask={<Rectangle fill="#FFFFFF" clipShape={shape(12)} />}
      placeholder={<Rectangle fill={T.rowBgHi} frame={{ width: 58, height: 58 }} />}
    />
  )
}

function PickRow({ pick, work }: { pick: WikiPick; work: Work | null | undefined }) {
  const T = usePalette()
  const row = (
    <HStack spacing={12} padding={10} frame={{ maxWidth: Infinity }} background={T.rowBg} clipShape={shape(16)}>
      <Cover work={work} T={T} />
      <VStack alignment="leading" spacing={4} frame={{ maxWidth: Infinity }}>
        <Text font="subheadline" fontWeight="semibold" foregroundStyle={T.text} lineLimit={2}>
          {pick.title}
        </Text>
        {pick.why.length > 0 ? (
          <Text font="caption" foregroundStyle={T.sub} lineLimit={3}>
            {pick.why}
          </Text>
        ) : null}
        {work === null ? (
          <Text font="caption2" foregroundStyle={T.faint}>
            站里没收录这部
          </Text>
        ) : null}
      </VStack>
    </HStack>
  )
  if (work == null) return row
  return (
    <NavigationLink destination={<WorkDetail work={work} />} buttonStyle="plain">
      {row}
    </NavigationLink>
  )
}

export function WikiCollectionPage({ slug }: { slug: string }) {
  const T = usePalette()
  const [detail, setDetail] = useState<WikiCollectionDetail | null>(null)
  const [works, setWorks] = useState<Record<string, Work | null>>({})
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let live = true
    fetchCollection(slug)
      .then((d) => {
        if (!live) return
        if (d == null) {
          setFailed(true)
          return
        }
        setDetail(d)
        d.picks.forEach((p) => {
          resolve(p.rj).then((w) => {
            if (live) setWorks((prev) => ({ ...prev, [p.rj]: w }))
          })
        })
      })
      .catch(() => {
        if (live) setFailed(true)
      })
    return () => {
      live = false
    }
  }, [slug])

  return (
    <ScrollView navigationTitle={detail?.title ?? "编辑精选"} navigationBarTitleDisplayMode="inline">
      <VStack spacing={14} padding={{ horizontal: 16, top: 12, bottom: 40 }} frame={{ maxWidth: Infinity }}>
        {detail == null ? (
          <Text font="subheadline" foregroundStyle={T.sub}>
            {failed ? "这篇没抓到，换个合集看。" : "正在读……"}
          </Text>
        ) : null}

        {detail != null && detail.title.length > 0 ? (
          <Text font="title3" fontWeight="bold" foregroundStyle={T.text}>
            {detail.title}
          </Text>
        ) : null}

        {detail != null && detail.intro.length > 0 ? (
          <Text font="subheadline" foregroundStyle={T.sub}>
            {detail.intro}
          </Text>
        ) : null}

        {detail != null ? (
          <VStack spacing={10} frame={{ maxWidth: Infinity }}>
            {detail.picks.map((p) => (
              <PickRow key={p.rj} pick={p} work={works[p.rj]} />
            ))}
          </VStack>
        ) : null}

        {detail != null ? (
          <Text font="caption2" foregroundStyle={T.faint}>
            简介与推荐语来自 J-ASMR Wiki
          </Text>
        ) : null}
      </VStack>
    </ScrollView>
  )
}

function CollectionRow({ item }: { item: WikiCollection }) {
  const T = usePalette()
  return (
    <NavigationLink destination={<WikiCollectionPage slug={item.slug} />} buttonStyle="plain">
      <VStack
        alignment="leading"
        spacing={6}
        padding={14}
        frame={{ maxWidth: Infinity }}
        background={T.rowBg}
        clipShape={shape(16)}
      >
        <Text font="subheadline" fontWeight="semibold" foregroundStyle={T.text} lineLimit={2}>
          {item.title}
        </Text>
        {item.blurb.length > 0 ? (
          <Text font="caption" foregroundStyle={T.sub} lineLimit={2}>
            {item.blurb}
          </Text>
        ) : null}
        <HStack spacing={6} frame={{ maxWidth: Infinity }}>
          <Text font="caption2" fontWeight="semibold" foregroundStyle={T.accent}>
            {`${item.count} 部`}
          </Text>
          <Spacer />
          <Image systemName="chevron.right" font="caption2" foregroundStyle={T.faint} />
        </HStack>
      </VStack>
    </NavigationLink>
  )
}

export function WikiCollectionsPage() {
  const T = usePalette()
  const [items, setItems] = useState<WikiCollection[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let live = true
    fetchCollections()
      .then((list) => {
        if (!live) return
        setItems(list)
        setLoading(false)
      })
      .catch(() => {
        if (live) setLoading(false)
      })
    return () => {
      live = false
    }
  }, [])

  return (
    <ScrollView navigationTitle="编辑精选" navigationBarTitleDisplayMode="inline">
      <VStack spacing={12} padding={{ horizontal: 16, top: 12, bottom: 40 }} frame={{ maxWidth: Infinity }}>
        {loading ? (
          <Text font="subheadline" foregroundStyle={T.sub}>
            正在拉清单……
          </Text>
        ) : null}
        {!loading && items.length === 0 ? (
          <Text font="subheadline" foregroundStyle={T.sub}>
            没拉到，检查下网络。
          </Text>
        ) : null}
        {items.map((it) => (
          <CollectionRow key={it.slug} item={it} />
        ))}
        {items.length > 0 ? (
          <Text font="caption2" foregroundStyle={T.faint}>
            标题、简介与推荐语来自 J-ASMR Wiki
          </Text>
        ) : null}
      </VStack>
    </ScrollView>
  )
}

/** 发现页上的入口卡片。 */
export function WikiShelf() {
  const T = usePalette()
  const [items, setItems] = useState<WikiCollection[]>([])

  useEffect(() => {
    let live = true
    fetchCollections()
      .then((list) => {
        if (live) setItems(list.slice(0, 3))
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [])

  if (items.length === 0) return null

  return (
    <VStack spacing={12} frame={{ maxWidth: Infinity }}>
      <HStack spacing={6} frame={{ maxWidth: Infinity }}>
        <Text font="title3" fontWeight="bold" foregroundStyle={T.text}>
          编辑精选
        </Text>
        <Spacer />
        <NavigationLink destination={<WikiCollectionsPage />} buttonStyle="plain">
          <Text font="caption" fontWeight="semibold" foregroundStyle={T.accent}>
            全部
          </Text>
        </NavigationLink>
      </HStack>
      <VStack spacing={10} frame={{ maxWidth: Infinity }}>
        {items.map((it) => (
          <CollectionRow key={it.slug} item={it} />
        ))}
      </VStack>
    </VStack>
  )
}
