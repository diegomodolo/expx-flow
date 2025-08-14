export interface ContentType {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  color: string;
}

export const contentTypes: ContentType[] = [
  // 🎬 ROTEIRO E TÍTULOS PARA VÍDEO
  {
    id: 'roteiro-tiktok',
    title: 'Roteiro para vídeos no TikTok',
    description: 'Roteiros envolventes para TikTok de 15-30 segundos',
    category: '🎬 ROTEIRO E TÍTULOS PARA VÍDEO',
    icon: '🎬',
    color: 'text-purple-600 dark:text-purple-400'
  },
  {
    id: 'roteiro-youtube-shorts',
    title: 'Roteiro para vídeos no Youtube Shorts',
    description: 'Roteiros otimizados para YouTube Shorts',
    category: '🎬 ROTEIRO E TÍTULOS PARA VÍDEO',
    icon: '📹',
    color: 'text-purple-600 dark:text-purple-400'
  },
  {
    id: 'titulos-youtube',
    title: 'Títulos para Youtube',
    description: 'Títulos atrativos que aumentam o CTR',
    category: '🎬 ROTEIRO E TÍTULOS PARA VÍDEO',
    icon: '🎯',
    color: 'text-purple-600 dark:text-purple-400'
  },

  // ✍️ IDEIAS E CONTEÚDOS
  {
    id: 'ideias-instagram',
    title: 'Ideias de conteúdo para Instagram',
    description: 'Posts, stories e reels criativos para Instagram',
    category: '✍️ IDEIAS E CONTEÚDOS',
    icon: '💡',
    color: 'text-yellow-600 dark:text-yellow-400'
  },
  {
    id: 'ideias-facebook',
    title: 'Ideias de conteúdo para Facebook',
    description: 'Conteúdo envolvente para aumentar alcance no Facebook',
    category: '✍️ IDEIAS E CONTEÚDOS',
    icon: '💭',
    color: 'text-yellow-600 dark:text-yellow-400'
  },
  {
    id: 'ideias-linkedin',
    title: 'Ideias de conteúdo para Linkedin',
    description: 'Conteúdo profissional para networking e autoridade',
    category: '✍️ IDEIAS E CONTEÚDOS',
    icon: '🧠',
    color: 'text-yellow-600 dark:text-yellow-400'
  },
  {
    id: 'ideias-blog',
    title: 'Ideias de conteúdo para Blog',
    description: 'Artigos e posts para blogs corporativos',
    category: '✍️ IDEIAS E CONTEÚDOS',
    icon: '📝',
    color: 'text-yellow-600 dark:text-yellow-400'
  },

  // 📝 CRIAÇÃO DE TEXTO
  {
    id: 'artigo-blog',
    title: 'Artigo para Blog',
    description: 'Artigos completos e otimizados para SEO',
    category: '📝 CRIAÇÃO DE TEXTO',
    icon: '📄',
    color: 'text-blue-600 dark:text-blue-400'
  },
  {
    id: 'email-marketing',
    title: 'E-mail marketing com copy persuasiva',
    description: 'E-mails que convertem e engajam',
    category: '📝 CRIAÇÃO DE TEXTO',
    icon: '📧',
    color: 'text-blue-600 dark:text-blue-400'
  },
  {
    id: 'landing-page',
    title: 'Texto para página de venda (Landing Page)',
    description: 'Copy persuasivo para landing pages de alta conversão',
    category: '📝 CRIAÇÃO DE TEXTO',
    icon: '🎯',
    color: 'text-blue-600 dark:text-blue-400'
  },
  {
    id: 'texto-anuncio',
    title: 'Texto para anúncio (criativo publicitário)',
    description: 'Copy impactante para campanhas publicitárias',
    category: '📝 CRIAÇÃO DE TEXTO',
    icon: '✨',
    color: 'text-blue-600 dark:text-blue-400'
  },

  // 🔍 ANÚNCIOS GOOGLE ADS
  {
    id: 'google-ads-pesquisa',
    title: 'Google Ads – Pesquisa',
    description: 'Anúncios otimizados para busca no Google',
    category: '🔍 ANÚNCIOS GOOGLE ADS',
    icon: '🔍',
    color: 'text-green-600 dark:text-green-400'
  },
  {
    id: 'google-ads-pmax',
    title: 'Google Ads – PMAX',
    description: 'Assets para campanhas Performance Max',
    category: '🔍 ANÚNCIOS GOOGLE ADS',
    icon: '⚡',
    color: 'text-green-600 dark:text-green-400'
  },
  {
    id: 'google-ads-discovery',
    title: 'Google Ads – Discovery',
    description: 'Anúncios para descoberta no Google',
    category: '🔍 ANÚNCIOS GOOGLE ADS',
    icon: '🎨',
    color: 'text-green-600 dark:text-green-400'
  },
  {
    id: 'google-ads-display',
    title: 'Google Ads – Display',
    description: 'Banners e criativos para rede de display',
    category: '🔍 ANÚNCIOS GOOGLE ADS',
    icon: '🖼️',
    color: 'text-green-600 dark:text-green-400'
  },
  {
    id: 'google-ads-video',
    title: 'Google Ads – Vídeo',
    description: 'Roteiros para anúncios em vídeo do Google',
    category: '🔍 ANÚNCIOS GOOGLE ADS',
    icon: '🎥',
    color: 'text-green-600 dark:text-green-400'
  },
  {
    id: 'google-ads-youtube',
    title: 'Google Ads – Youtube',
    description: 'Anúncios especializados para YouTube',
    category: '🔍 ANÚNCIOS GOOGLE ADS',
    icon: '📺',
    color: 'text-green-600 dark:text-green-400'
  },

  // 📱 ANÚNCIOS EM REDES SOCIAIS
  {
    id: 'facebook-ads',
    title: 'Facebook Ads',
    description: 'Anúncios otimizados para Facebook',
    category: '📱 ANÚNCIOS EM REDES SOCIAIS',
    icon: '📘',
    color: 'text-pink-600 dark:text-pink-400'
  },
  {
    id: 'instagram-ads-feed',
    title: 'Instagram Ads – Feed',
    description: 'Anúncios para feed do Instagram',
    category: '📱 ANÚNCIOS EM REDES SOCIAIS',
    icon: '📸',
    color: 'text-pink-600 dark:text-pink-400'
  },
  {
    id: 'instagram-ads-stories',
    title: 'Instagram Ads – Stories',
    description: 'Anúncios verticais para stories',
    category: '📱 ANÚNCIOS EM REDES SOCIAIS',
    icon: '📱',
    color: 'text-pink-600 dark:text-pink-400'
  },
  {
    id: 'instagram-ads-reels',
    title: 'Instagram Ads – Reels',
    description: 'Roteiros para anúncios em reels',
    category: '📱 ANÚNCIOS EM REDES SOCIAIS',
    icon: '🎪',
    color: 'text-pink-600 dark:text-pink-400'
  },
  {
    id: 'linkedin-ads',
    title: 'Linkedin Ads',
    description: 'Anúncios profissionais para LinkedIn',
    category: '📱 ANÚNCIOS EM REDES SOCIAIS',
    icon: '💼',
    color: 'text-pink-600 dark:text-pink-400'
  },
  {
    id: 'youtube-ads',
    title: 'Youtube Ads',
    description: 'Roteiros para anúncios no YouTube',
    category: '📱 ANÚNCIOS EM REDES SOCIAIS',
    icon: '🎬',
    color: 'text-pink-600 dark:text-pink-400'
  },
  {
    id: 'tiktok-ads',
    title: 'TikTok Ads',
    description: 'Anúncios nativos para TikTok',
    category: '📱 ANÚNCIOS EM REDES SOCIAIS',
    icon: '🎵',
    color: 'text-pink-600 dark:text-pink-400'
  },

  // 🎯 COPY PARA TRÁFEGO E CONVERSÃO
  {
    id: 'headline-anuncio',
    title: 'Headline para anúncio',
    description: 'Headlines poderosas que param o scroll',
    category: '🎯 COPY PARA TRÁFEGO E CONVERSÃO',
    icon: '🎯',
    color: 'text-orange-600 dark:text-orange-400'
  },
  {
    id: 'subheadline-anuncio',
    title: 'Subheadline para anúncio',
    description: 'Subheadlines que complementam e convencem',
    category: '🎯 COPY PARA TRÁFEGO E CONVERSÃO',
    icon: '📝',
    color: 'text-orange-600 dark:text-orange-400'
  },
  {
    id: 'cta-criativo',
    title: 'Call-to-Action (CTA) para criativo',
    description: 'CTAs que convertem e geram ação',
    category: '🎯 COPY PARA TRÁFEGO E CONVERSÃO',
    icon: '👆',
    color: 'text-orange-600 dark:text-orange-400'
  },
  {
    id: 'copy-remarketing',
    title: 'Copy para remarketing',
    description: 'Copy específico para reconquistar audiências',
    category: '🎯 COPY PARA TRÁFEGO E CONVERSÃO',
    icon: '🔄',
    color: 'text-orange-600 dark:text-orange-400'
  },
  {
    id: 'copy-dm-direto',
    title: 'Copy para anúncio direto em mensagem',
    description: 'Mensagens persuasivas para DM',
    category: '🎯 COPY PARA TRÁFEGO E CONVERSÃO',
    icon: '💬',
    color: 'text-orange-600 dark:text-orange-400'
  },
  {
    id: 'copy-lead-isca',
    title: 'Copy para geração de lead com isca',
    description: 'Copy para capturar leads com iscas digitais',
    category: '🎯 COPY PARA TRÁFEGO E CONVERSÃO',
    icon: '🎣',
    color: 'text-orange-600 dark:text-orange-400'
  },

  // 📣 GERAÇÃO DE POSTS TEMÁTICOS
  {
    id: 'post-comemorativo',
    title: 'Post comemorativo de datas sazonais',
    description: 'Posts para datas comemorativas e sazonais',
    category: '📣 GERAÇÃO DE POSTS TEMÁTICOS',
    icon: '🎉',
    color: 'text-cyan-600 dark:text-cyan-400'
  },
  {
    id: 'post-autoridade',
    title: 'Post de autoridade (prova social ou case)',
    description: 'Posts que demonstram autoridade e credibilidade',
    category: '📣 GERAÇÃO DE POSTS TEMÁTICOS',
    icon: '🏆',
    color: 'text-cyan-600 dark:text-cyan-400'
  },
  {
    id: 'post-engajamento',
    title: 'Post de engajamento com pergunta',
    description: 'Posts que estimulam interação e comentários',
    category: '📣 GERAÇÃO DE POSTS TEMÁTICOS',
    icon: '❓',
    color: 'text-cyan-600 dark:text-cyan-400'
  },
  {
    id: 'post-bastidores',
    title: 'Post de bastidores da empresa',
    description: 'Posts que humanizam a marca',
    category: '📣 GERAÇÃO DE POSTS TEMÁTICOS',
    icon: '🎭',
    color: 'text-cyan-600 dark:text-cyan-400'
  },
  {
    id: 'post-educativo',
    title: 'Post educativo ou tutorial',
    description: 'Posts que educam e agregam valor',
    category: '📣 GERAÇÃO DE POSTS TEMÁTICOS',
    icon: '📚',
    color: 'text-cyan-600 dark:text-cyan-400'
  },
  {
    id: 'post-curiosidade',
    title: 'Post com curiosidade do nicho',
    description: 'Posts com fatos interessantes do setor',
    category: '📣 GERAÇÃO DE POSTS TEMÁTICOS',
    icon: '🤔',
    color: 'text-cyan-600 dark:text-cyan-400'
  },
  {
    id: 'post-desafio',
    title: 'Post com desafio ou interação',
    description: 'Posts que criam desafios e participação',
    category: '📣 GERAÇÃO DE POSTS TEMÁTICOS',
    icon: '🏃',
    color: 'text-cyan-600 dark:text-cyan-400'
  },

  // 🔄 OUTROS
  {
    id: 'carrossel-instagram',
    title: 'Geração de carrossel para Instagram',
    description: 'Carrosséis educativos e envolventes',
    category: '🔄 OUTROS',
    icon: '🎠',
    color: 'text-gray-600 dark:text-gray-400'
  },
  {
    id: 'roteiro-podcast',
    title: 'Geração de roteiro de podcast',
    description: 'Roteiros estruturados para podcasts',
    category: '🔄 OUTROS',
    icon: '🎙️',
    color: 'text-gray-600 dark:text-gray-400'
  }
];