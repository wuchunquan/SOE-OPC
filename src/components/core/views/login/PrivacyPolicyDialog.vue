<!-- 隐私协议与用户协议弹窗 -->
<template>
  <ElDialog
    v-model="visible"
    :title="activeTab === 'privacy' ? '隐私政策' : '用户协议'"
    width="680px"
    top="5vh"
    :close-on-click-modal="false"
    destroy-on-close
    append-to-body
    class="privacy-dialog"
  >
    <div class="tab-bar">
      <span
        class="tab-item"
        :class="{ active: activeTab === 'privacy' }"
        @click="activeTab = 'privacy'"
      >
        隐私政策
      </span>
      <span
        class="tab-item"
        :class="{ active: activeTab === 'agreement' }"
        @click="activeTab = 'agreement'"
      >
        用户协议
      </span>
    </div>

    <div class="policy-content">
      <!-- 隐私政策 -->
      <div v-if="activeTab === 'privacy'">
        <h3>{{ APP_NAME }} 隐私政策</h3>
        <p class="update-date">生效日期：2026年3月10日</p>

        <p>
          欢迎使用{{ APP_NAME }}（以下简称"本产品"、"本平台"或"我们"）。我们是一款面向国企场景的 AI Agent 智能协作工具，为您提供 AI 辅助办公、智能对话、任务处理等服务。
        </p>
        <p>
          我们深知个人信息对您的重要性，并会尽全力保护您的个人信息安全。请您在使用本产品前，仔细阅读并充分理解本隐私政策。一旦您开始使用本产品，即视为您已充分理解并同意本政策的全部内容。
        </p>

        <h4>一、我们收集的信息</h4>
        <p>为了向您提供稳定、安全、个性化的服务，我们可能会收集以下信息。我们会遵循合法、正当、必要的原则，仅收集实现服务功能所必需的信息。</p>
        <p><strong>1.1 您主动提供的信息</strong></p>
        <ul>
          <li><strong>账号信息：</strong>您注册时提供的手机号码、用户名、邮箱地址等基本信息。</li>
          <li><strong>身份验证信息：</strong>您登录时的账号密码（我们采用不可逆的加密技术存储密码，我们的工作人员无法获取您的明文密码）。</li>
          <li><strong>反馈信息：</strong>您通过客服渠道向我们提交的意见、建议或问题。</li>
        </ul>
        <p><strong>1.2 您使用服务过程中产生的信息</strong></p>
        <ul>
          <li><strong>会话记录：</strong>您与 AI 智能员工之间的对话内容、上传的文件（如文档、图片）等。这些数据是AI为您提供服务的基础。</li>
          <li><strong>操作日志：</strong>您在使用本产品过程中的功能使用记录、点击行为、配置更改记录等。</li>
        </ul>
        <p><strong>1.3 设备与网络信息</strong></p>
        <ul>
          <li><strong>设备信息：</strong>设备型号、操作系统版本、浏览器类型及版本、唯一设备标识符（仅用于区分设备，不可识别个人身份）。</li>
          <li><strong>日志信息：</strong>IP地址、访问时间、网络环境、异常报错信息等。</li>
        </ul>
        <p><strong>特别提示：</strong>请您务必避免在与 AI 的对话或上传的文件中输入国家秘密、商业秘密敏感信息、个人财产信息、个人健康医疗信息等高度敏感信息。</p>

        <h4>二、信息的使用</h4>
        <p>我们收集的信息将用于以下目的：</p>
        <ul>
          <li>使用您的会话记录和上传文件，实时响应您的指令，完成 AI 对话、任务处理、文件分析等功能。</li>
          <li>验证您的身份，检测异常登录，保障账号安全。</li>
          <li>分析产品使用情况（如功能热度、报错频率），以改进产品设计、优化用户体验。</li>
          <li>向您发送重要的服务通知，如版本更新、安全提醒、协议变更等。</li>
          <li>为提升 AI 的回复质量，我们可能会使用您的匿名化会话数据（经过脱敏处理，无法识别特定个人）进行模型训练。如您不希望您的数据用于训练，您可以在设置中选择关闭。</li>
        </ul>

        <h4>三、Cookie 与本地存储</h4>
        <p>
          本产品可能会使用 Cookie 和本地存储技术来保存您的登录状态、偏好设置（如主题、语言）等信息，以提供更流畅的使用体验。您可以通过浏览器设置管理或清除 Cookie，但请注意，禁用 Cookie 可能会影响部分功能的正常使用。
        </p>

        <h4>四、信息的存储与保护</h4>
        <ul>
          <li>您的个人信息将存储在中华人民共和国境内的服务器中。我们不会将您的个人信息传输至境外。</li>
          <li><strong>存储期限：</strong>我们仅在实现本政策所述目的所必需的期限内保留您的信息，除非法律法规另有要求。在您的账号注销或删除后，我们将在合理期限内（通常为30天）删除或匿名化处理您的个人信息。</li>
          <li><strong>安全措施：</strong>我们采用 TLS 加密传输、数据加密存储、访问权限控制、操作日志审计等业界通用安全技术，防止数据泄露、篡改或丢失。</li>
          <li><strong>访问控制：</strong>我们严格限制能够访问您个人信息的员工范围，并要求其履行保密义务，违反者将受到处理。</li>
        </ul>

        <h4>五、关于 Windows 桌面版的特别说明</h4>
        <p>如果您下载并使用本产品的 Windows 桌面版，请注意以下隐私相关事项：</p>
        <ul>
          <li><strong>本地数据处理：</strong>部分 AI 运算可能完全在您的本地电脑上执行，这意味着涉及该运算的数据（如部分对话上下文）不会上传至我们的云端服务器。</li>
          <li><strong>本地存储安全：</strong>桌面版可能会在您的电脑本地缓存部分数据以提升响应速度。您需自行负责您个人电脑的安全防护，防止他人非法访问您的本地数据。</li>
          <li><strong>功能差异：</strong>桌面版与网页版的功能范围可能存在差异，相应的数据收集范围也会有所不同，具体以您使用的版本界面提示为准。</li>
        </ul>

        <h4>六、信息的共享与公开</h4>
        <p>我们高度重视您的隐私，承诺不会出售、出租或非法交易您的个人信息。在以下法定或约定情形下，我们可能会共享您的信息：</p>
        <ul>
          <li>在获得您的单独同意后，与其他第三方共享。</li>
          <li>根据适用的法律法规、法律程序（如法院传票、政府部门的合法要求）的需要进行披露。</li>
          <li>为保护本产品用户或公众的人身、财产安全所必需，且在合理范围内进行披露。</li>
          <li><strong>合并与收购：</strong>如发生合并、收购、资产转让等交易，您的个人信息可能作为交易资产的一部分进行转移，我们将要求继受方继续受本政策的约束。</li>
        </ul>

        <h4>七、您的权利</h4>
        <p>您对您的个人信息享有以下权利：</p>
        <ul>
          <li><strong>查阅与复制：</strong>您可以通过产品内功能查阅您的个人信息，或联系我们来获取您的个人信息副本。</li>
          <li><strong>更正与补充：</strong>如您发现您的个人信息不准确或不完整，您有权要求我们进行更正或补充。</li>
          <li><strong>删除与注销：</strong>您可以通过产品设置自行注销账号。账号注销后，我们将依法删除您的个人信息。</li>
          <li><strong>撤回同意：</strong>对于基于同意收集的信息（如用于模型训练的对话数据），您可以在产品设置中随时撤回您的同意，撤回不影响撤回前基于同意已进行的处理。</li>
        </ul>

        <h4>八、未成年人保护</h4>
        <p>
          本产品主要面向成年人（18周岁以上）提供服务。如果您是未成年人，请在监护人的指导下使用本产品，并确保在监护人同意的情况下向我们提供个人信息。我们不会故意收集未成年人的个人信息。
        </p>

        <h4>九、隐私政策的更新</h4>
        <p>
          我们可能会适时修订本隐私政策。当政策发生重大变更时（如收集范围、使用目的的重大变化），我们会通过产品内弹窗、公告或站内信等方式显著告知您。重大变更生效后，继续使用本产品即表示您同意修订后的隐私政策。
        </p>

        <h4>十、联系我们</h4>
        <p>
          如您对本隐私政策有任何疑问、意见或投诉，或需要行使您的个人信息权利，请通过以下方式联系我们（请注明"隐私政策咨询"）：
        </p>
        <ul>
          <li>微信：fine8_8</li>
        </ul>
        <p>我们将尽快审核您的问题，并在5个工作日内予以回复。</p>
      </div>

      <!-- 用户协议 -->
      <div v-if="activeTab === 'agreement'">
        <h3>{{ APP_NAME }} 用户协议</h3>
        <p class="update-date">生效日期：2026年3月10日</p>

        <p>
          欢迎您使用{{ APP_NAME }}（以下简称"本产品"或"本平台"）。本产品是一款面向国企场景的 AI Agent 智能协作工具，为您提供 AI 辅助办公、智能对话、任务处理等服务，旨在打造"国产小龙虾-您的国企新员工"。
        </p>
        <p>
          请您在使用前仔细阅读本用户协议（以下简称"本协议"）。当您以注册、登录、下载安装（Windows桌面版）或任何其他方式使用本产品时，即视为您已充分阅读、理解并同意接受本协议的全部内容。
        </p>

        <h4>一、服务说明</h4>
        <ul>
          <li>{{ APP_NAME }} 作为 AI 智能员工平台，具备调用各类工具、操作系统资源、访问外部服务的能力，帮助您高效处理工作。</li>
          <li>本产品提供网页端及 Windows 桌面版服务。桌面版旨在为您提供本地 AI 能力体验，其数据处理方式可能与云端有所区别，具体见《隐私政策》。</li>
          <li>本产品基于国产 AI 大模型构建。在享受其带来的便捷性之余，您必须充分了解 AI 生成内容可能存在的不准确、不完整或滞后性，不得将其作为国企重大决策、合规审查或涉密事务的唯一依据。</li>
        </ul>

        <h4>二、账号管理</h4>
        <ul>
          <li>您应提供真实、准确的注册信息（如涉及工作单位认证，请确保信息符合单位规定），并及时更新以保证信息的有效性。</li>
          <li>您应妥善保管您的账号和密码。因您保管不善（如密码泄露、账号共用）导致的损失由您自行承担。</li>
          <li>您的账号仅限您本人使用，禁止以任何形式转让、借用、租用或共享您的账号。</li>
          <li>如您发现账号存在安全问题，请立即通过本协议第九条列明的方式联系我们。</li>
        </ul>

        <h4>三、使用规范</h4>
        <p>在使用本产品时，您承诺遵守以下规范：</p>
        <ul>
          <li>遵守中华人民共和国相关法律法规及本协议的约定，特别是关于网络安全、数据安全及国有资产保密的有关规定。</li>
          <li>不得利用本产品生成、传播违法有害信息，或从事任何侵犯他人知识产权、隐私权等合法权益的行为。</li>
          <li>不得尝试对本产品进行反向工程、破解、篡改或干扰其正常运行。</li>
          <li>不得利用本产品进行未经授权的网络扫描、渗透测试或其他危及网络安全的行为。</li>
          <li><strong>内容合规：</strong>您保证您输入到本平台的数据来源合法，不包含国家秘密、商业秘密敏感信息及其他不宜公开的内容。</li>
        </ul>

        <h4>四、安全风险与责任承担</h4>
        <ul>
          <li><strong>配置与操作风险：</strong>本产品具备强大的工具调用能力。当您启动本产品或调整相关配置项（如授权 AI 访问本地文件、调用外部工具等）时，即视为您已明确知晓各项设置背后的安全意义及风险等级。您在使用本服务过程中，所进行的个性化配置、操作选择，以及由此产生的所有法律、财产、数据相关风险，均由您自行承担。</li>
          <li><strong>AI 输出风险：</strong>AI 生成的内容可能存在不准确、不完整甚至误导性信息。对于 AI 提供的建议，尤其是在涉及财务、法务、人事等专业领域时，请您务必结合专业人士的意见进行审慎判断，我们不对因依赖 AI 输出结果而造成的任何损失承担赔偿责任。</li>
          <li><strong>本地部署风险（针对Windows桌面版）：</strong>
            <ul>
              <li>数据存储：桌面版的部分数据处理可能在您的本地设备完成，您需自行负责本地设备的数据安全与备份。</li>
              <li>性能影响：运行本地 AI 模型可能占用较多的计算机资源（CPU/GPU/内存），可能影响您电脑的运行速度或稳定性。</li>
            </ul>
          </li>
          <li><strong>数据备份：</strong>请您定期备份重要数据。因系统故障、软件升级或其他不可抗力导致的数据丢失，我们将尽力协助恢复，但不承担赔偿责任。</li>
          <li><strong>第三方服务：</strong>本产品可能集成第三方服务或跳转至第三方链接，其行为和安全性由第三方负责，我们不对第三方服务进行任何明示或暗示的担保。</li>
        </ul>

        <h4>五、知识产权</h4>
        <ul>
          <li><strong>平台知识产权：</strong>本产品的所有内容（包括但不限于软件代码、界面设计、图标、文案、LOGO等）的知识产权归我们（及关联公司）所有。未经我们书面许可，您不得复制、修改、分发或进行商业利用。</li>
          <li><strong>生成内容知识产权：</strong>您在使用本产品过程中由 AI 生成的内容，其知识产权归属按照"您拥有输入，即视为您拥有输出"的原则进行处理（即您对输入数据享有合法权利的，您对输出内容亦享有相应的权利，但因 AI 随机性导致的雷同内容不在此限）。但您不得利用 AI 生成内容侵犯他人著作权。</li>
          <li><strong>国企特殊说明：</strong>如您代表所在国企使用本服务，使用过程中产生的智力成果，其权利的行使应遵守您所在单位的规章制度。</li>
        </ul>

        <h4>六、服务变更与中断</h4>
        <ul>
          <li>我们有权根据业务需要对服务内容进行调整、升级或终止，并将通过产品内通知、公告等方式提前告知。</li>
          <li>因系统定期维护、升级或不可抗力（如网络攻击、政策变化、自然灾害等）导致的服务中断，我们将尽力减少对您的影响，但不承担因此产生的违约责任。</li>
        </ul>

        <h4>七、免责声明</h4>
        <p>在法律允许的最大范围内，我们明确声明：</p>
        <ul>
          <li>本产品按"现状"和"可用性"提供，不对适销性、特定用途适用性作任何默示担保。</li>
          <li>我们不对 AI 生成内容的准确性、完整性、可靠性作任何保证，您应独立核实关键信息。</li>
          <li>因用户自身原因（包括但不限于配置不当、违规操作、账号密码泄露、输入敏感数据等）造成的任何直接或间接损失，由用户自行承担。</li>
        </ul>

        <h4>八、协议变更</h4>
        <p>
          我们有权根据需要修订本协议。修订后的协议将通过产品内通知、网站公告等方式告知您。如您在修订生效后继续使用本产品，即视为您同意接受修订后的协议。如您不同意修订内容，应立即停止使用本产品并注销账号。
        </p>

        <h4>九、联系我们</h4>
        <p>如您对本协议有任何疑问、意见或投诉，请通过以下方式联系我们（请注明"用户协议咨询"）：</p>
        <ul>
          <li>微信：fine8_8</li>
        </ul>
      </div>
    </div>

    <template #footer>
      <ElButton type="primary" @click="visible = false">我已阅读并了解</ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import { APP_NAME } from '@/config/appInfo'

  defineOptions({ name: 'PrivacyPolicyDialog' })

  const visible = defineModel<boolean>('visible', { default: false })

  interface Props {
    defaultTab?: 'privacy' | 'agreement'
  }

  const props = withDefaults(defineProps<Props>(), {
    defaultTab: 'privacy'
  })

  const activeTab = ref<'privacy' | 'agreement'>(props.defaultTab)

  watch(
    () => props.defaultTab,
    (val) => {
      activeTab.value = val
    }
  )
</script>

<style lang="scss" scoped>
  .tab-bar {
    display: flex;
    gap: 24px;
    border-bottom: 1px solid var(--el-border-color-lighter);
    padding-bottom: 12px;
    margin-bottom: 16px;
  }

  .tab-item {
    font-size: 15px;
    color: var(--el-text-color-secondary);
    cursor: pointer;
    padding-bottom: 12px;
    position: relative;
    transition: color 0.2s;

    &:hover {
      color: var(--el-text-color-primary);
    }

    &.active {
      color: var(--el-color-primary);
      font-weight: 600;

      &::after {
        content: '';
        position: absolute;
        bottom: -1px;
        left: 0;
        right: 0;
        height: 2px;
        background: var(--el-color-primary);
        border-radius: 1px;
      }
    }
  }

  .policy-content {
    max-height: 60vh;
    overflow-y: auto;
    padding-right: 8px;
    font-size: 14px;
    line-height: 1.8;
    color: var(--el-text-color-regular);

    h3 {
      font-size: 18px;
      font-weight: 600;
      color: var(--el-text-color-primary);
      margin-bottom: 4px;
    }

    .update-date {
      font-size: 13px;
      color: var(--el-text-color-secondary);
      margin-bottom: 16px;
    }

    h4 {
      font-size: 15px;
      font-weight: 600;
      color: var(--el-text-color-primary);
      margin-top: 20px;
      margin-bottom: 8px;
    }

    p {
      margin-bottom: 8px;
    }

    ul {
      padding-left: 20px;
      margin-bottom: 8px;

      li {
        margin-bottom: 4px;
        list-style-type: disc;
      }
    }

    strong {
      color: var(--el-text-color-primary);
    }
  }
</style>
