import {
  Button,
  HStack,
  Image,
  ProgressView,
  Rectangle,
  ScrollView,
  SecureField,
  Spacer,
  Text,
  TextField,
  VStack,
  useEffect,
  useState,
} from "scripting"
import { authUser, loginAccount, logoutAccount, onAuthChange } from "../lib/api"
import { glass, glassCircle, rjCode, shape, usePalette } from "../lib/theme"
import { PageHeader } from "./parts"

function Row({ children }: { children: any }) {
  const T = usePalette()
  return (
    <HStack spacing={10} padding={{ horizontal: 12, vertical: 6 }} frame={{ maxWidth: Infinity }}>
      {children}
    </HStack>
  )
}

export function LoginPage() {
  const T = usePalette()
  const [user, setUser] = useState<string | null>(authUser())
  const [name, setName] = useState("")
  const [pw, setPw] = useState("")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => onAuthChange(() => setUser(authUser())), [])

  const submit = async () => {
    if (name.trim().length === 0 || pw.length === 0) {
      setErr("账号密码都填上。")
      return
    }
    setBusy(true)
    setErr(null)
    setDone(false)
    try {
      const u = await loginAccount(name.trim(), pw)
      setUser(u)
      setPw("")
      setName("")
      setDone(true)
    } catch (e: any) {
      setErr(String(e?.message ?? e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <ScrollView navigationBarVisibility="hidden" background={<Rectangle fill={T.bg} ignoresSafeArea />}>
      <VStack spacing={12} padding={{ horizontal: 16, top: 8, bottom: 60 }} frame={{ maxWidth: Infinity }}>
        <PageHeader title="账号" back />

        <HStack spacing={12} padding={14} background={T.card} clipShape={shape(16)} frame={{ maxWidth: Infinity }}>
          <Image
            systemName={user != null ? "checkmark.seal.fill" : "person.crop.circle.badge.questionmark"}
            font="title2"
            foregroundStyle={user != null ? T.accentText : T.faint}
            frame={{ width: 40, height: 40 }}
            multilineTextAlignment="center"
          />
          <VStack alignment="leading" spacing={2} frame={{ maxWidth: Infinity }}>
            <Text font="footnote" fontWeight="semibold">
              {user != null ? user : "未登录"}
            </Text>
            <Text font="caption2" foregroundStyle={T.faint} lineLimit={1}>
              {user != null ? "asmr.one · 已连接" : "登录后才能用云端歌单"}
            </Text>
          </VStack>
          <Spacer />
          {user != null ? (
            <Text
              font="caption"
              fontWeight="semibold"
              foregroundStyle={T.sub}
              padding={{ horizontal: 10, vertical: 5 }}
              background={T.rowBgHi}
              clipShape={{ type: "rect", cornerRadius: 8 }}
              contentShape="rect"
              onTapGesture={() => {
                logoutAccount()
                setUser(null)
                setDone(false)
              }}
            >
              退出
            </Text>
          ) : null}
        </HStack>

        {user == null ? (
          <VStack spacing={0} background={T.card} clipShape={shape(16)} frame={{ maxWidth: Infinity }}>
            <Row>
              <Image systemName="at" font="footnote" foregroundStyle={T.faint} frame={{ width: 20 }} />
              <TextField
                title=""
                prompt="asmr.one 用户名"
                value={name}
                onChanged={(v: string) => setName(v)}
                frame={{ maxWidth: Infinity }}
              />
            </Row>
          <Rectangle fill={T.border} frame={{ maxWidth: "infinity", height: 0.5 }} padding={{ horizontal: 12 }} />
            <Row>
              <Image systemName="lock" font="footnote" foregroundStyle={T.faint} frame={{ width: 20 }} />
              <SecureField
                title=""
                prompt="密码"
                value={pw}
                onChanged={(v: string) => setPw(v)}
              />
            </Row>
            <HStack spacing={0} padding={{ horizontal: 12, bottom: 8 }} frame={{ maxWidth: Infinity }}>
              <Button
                title={busy ? "登录中…" : "登录"}
                action={() => {
                  if (!busy) submit()
                }}
                buttonStyle="borderedProminent"
                tint={T.accent as any}
                disabled={busy}
                frame={{ maxWidth: Infinity }}
              />
            </HStack>
          </VStack>
        ) : null}

        {busy ? (
          <HStack spacing={8} alignment="center">
            <ProgressView />
            <Text font="caption" foregroundStyle={T.sub}>
              验证中…
            </Text>
          </HStack>
        ) : null}

        {err != null ? (
          <Text font="footnote" foregroundStyle={T.accentText}>
            {err}
          </Text>
        ) : null}

        {done && user != null ? (
          <Text font="footnote" foregroundStyle={T.sub}>
            {`登录成功，${user}。`}
          </Text>
        ) : null}

        <VStack spacing={4} padding={{ top: 8 }} frame={{ maxWidth: Infinity }}>
          <Text font="caption2" foregroundStyle={T.faint}>
            token 只存在本机 Scripting 存储里，退出即删。
          </Text>
          <Text font="caption2" foregroundStyle={T.faint}>
            账号密码不落盘，只在登录那一刻发一次。
          </Text>
        </VStack>
      </VStack>
    </ScrollView>
  )
}
