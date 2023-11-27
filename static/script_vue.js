import Vue from 'vue'
import Echo from 'laravel-echo'
window.Pusher = require('pusher-js')

export default {
  data: () => ({
    selected: [2],
    items: [],
    messages: [],
    message: '',
    selectedChat: {},
  }),
  created() {
    this.loadMessages()
  },
  mounted() {
    window.Echo = new Echo({
      broadcaster: 'pusher',
      key: process.env.pusherAppKey,
      cluster: process.env.pusherAppCluster,
      forceTLS: true,
  });
  this.subscribeToChannel()

  },
  methods: {
    subscribeToChannel() {
    console.log('Intentando suscribirse al canal con ID:', this.selectedChat.wa_id);
    if (this.selectedChat && this.selectedChat.wa_id) {
      window.Echo.private('webhooks.' + this.selectedChat.wa_id)
        .listen('.webhook', (e) => {
          const { message, change } = e;

          if (change === false) {
            // Si es un nuevo mensaje, simplemente lo agregamos.
            this.appendMessage(message);
          } else {
            // Si hay un cambio en un mensaje existente, lo actualizamos.
            const msgIndex = this.messages.findIndex((m) => m.wam_id === message.wam_id);
            if (msgIndex !== -1) {
              Vue.set(this.messages, msgIndex, message);
            }
          }

          // Desplazar hacia el fondo del chat si es un nuevo mensaje
          if (change === false) {
            this.scrollToBottom();
          }
        });
    }
  },

    checkHeaderImage(message) {
      return message.data?.header_type === 'IMAGE'
    },
    appendMessage(message) {
      this.messages.push(message);
    },
    loadMessages() {
      this.$axios.get('/messages').then(({ data }) => {
        this.items = data.data
      })
    },
    loadConversation(chat) {
      this.selectedChat = chat
      this.$axios.get('/messages/' + chat.wa_id).then(({ data }) => {
        this.messages = data.data
        this.subscribeToChannel()
        this.scrollToBottom()
        console.log(this.subscribeToChannel);
      })
    },
    sendMessage() {
      const payload = {
        wa_id: this.selectedChat.wa_id,
        body: this.message,
      }
      this.$axios.post('/messages', payload).then(({ data }) => {

        if (data.success && data.data.body) {
          this.messages.push({
            body: data.data.body,
            created_at: this.$moment(data.data.created_at).format('DD/MM/YY'),
            wam_id: data.data.wam_id,
          });
          this.message = '';
          this.scrollToBottom()
        } else {
          console.error('Error al recibir datos del servidor', data);
        }
      })
        .catch((err) => {
          console.log(err)
        })
    },

    scrollToBottom() {
      setTimeout(() => {
        const container = this.$el.querySelector('.chat-box')
        if (container?.scrollHeight) {
          container.scrollTop = container?.scrollHeight
        }
      }, 100)
    },
    formatReadStatus(status) {
      const statuses = {
        read: {
          color: 'blue',
          icon: 'mdi-check-all',
          tooltip: 'Read',
        },
        delivered: {
          color: 'grey',
          icon: 'mdi-check-all',
          tooltip: 'Delivered',
        },
        sent: {
          color: 'grey',
          icon: 'mdi-check',
          tooltip: 'Sent',
        },
        failed: {
          color: 'red',
          icon: 'mdi-alert-circle',
          tooltip: 'Failed',
        },
      }

      if (statuses?.[status]) {
        return statuses[status]
      } else {
        return {
          color: 'grey',
          icon: 'mdi-cards-diamond-outline',
          tooltip: '',
        }
      }
    },
}
}
