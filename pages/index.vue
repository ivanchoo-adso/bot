<template>
  <v-row>
    <!-- Chat list -->
    <v-col sm="3">
      <v-card elevation="7" class="chat-list">
        <v-card class="pa-2" color="#424242" dark>Chats</v-card>
        <v-list class="py-0" two-line>
          <v-list-item-group v-model="selected" active-class="green--text">
            <template v-for="(item, index) in items">
              <v-list-item :key="item.wa_id" @click="loadConversation(item)">
                <template>
                  <v-list-item-content>
                    <v-list-item-title v-text="item.wa_id"></v-list-item-title>

                    <v-list-item-subtitle
                      v-text="item.body"
                    ></v-list-item-subtitle>
                  </v-list-item-content>
                </template>
              </v-list-item>

              <v-divider
                v-if="index < items.length - 1"
                :key="index"
              ></v-divider>
            </template>
          </v-list-item-group>
        </v-list>
      </v-card>
    </v-col>

    <!-- Conversations -->
    <v-col md="9">
      <v-card elevation="7">
        <v-card class="chat-box wpp-bg" color="#efeae2">
          <v-card class="pa-2" color="#424242" dark>Ali Connors</v-card>
          <div
            v-for="(message, index) in messages"
            :key="index"
            :class="[
              'pa-1',
              'd-flex',
              { 'justify-start': !message.outgoing },
              { 'justify-end': message.outgoing },
            ]"
          >
            <v-card
              class="pa-2 ma-2 message-card"
              :color="message.outgoing ? 'green accent-1' : 'white'"
            >
              <div>
                <div v-if="message.type == 'text'">

                </div>
                <div v-else-if="message.type == 'template'">

                  <img
                    v-if="checkHeaderImage(message)"
                    :src="message.data.header_url"
                    class="img-msg"
                  />

                </div>
                <div v-else-if="message.type == 'image'">
                  <img :src="message.body" class="img-msg" />
                </div>
                <div v-else-if="message.type == 'audio'">
                  <audio controls>
                    <source :src="message.body" type="audio/ogg" />
                    Your browser does not support the audio element.
                  </audio>
                </div>
                <div v-if="message.type == 'sticker'">
                  <img :src="message.body" class="img-sticker" />
                </div>
                <div v-else-if="message.type == 'video'">
                  <video width="320" height="240" controls>
                    <source :src="message.body" />
                    Your browser does not support the video tag.
                  </video>
                </div>
                <div v-else-if="message.type == 'document'">
                   <a :href="message.body" target="_blank">Download Document</a>
                </div>
                {{ processMessageBody(message.body) }}
                <p class="text-right text-subtitle-2 font-italic">
                  {{ message.created_at }}
                  <v-icon
                  :color="formatReadStatus(message.status).color"
                   small
                  >{{ formatReadStatus(message.status).icon }}</v-icon
                  >

                </p>
              </div>
            </v-card>
          </div>
        </v-card>
        <v-divider></v-divider>
        <div class="pa-3">
          <v-text-field
            v-model="message"
            dense
            outlined
            background-color="white"
            :append-outer-icon="'mdi-send'"
            filled
            clear-icon="mdi-close-circle"
            clearable
            label="Type a message..."
            type="text"
            class="message-box"
            @click:append-outer="sendMessage"
            @keydown.enter.exact.prevent="sendMessage"
          ></v-text-field>
        </div>
      </v-card>
    </v-col>
  </v-row>
</template>
<script>
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

    this.subscribeToChannel();
    window.Echo.connector.pusher.connection.bind('connected', () => {
    console.log('Conectado al WebSocket');
  });

  window.Echo.connector.pusher.connection.bind('disconnected', () => {
    console.log('Desconectado del WebSocket');
  });
  },


  methods: {
   processMessageBody(body, type) {
    if (type === 'text') {
      return body; // Devuelve el cuerpo del mensaje tal como está si no es de tipo 'text'
    }
    const baseUrl = 'http://localhost:8000/storage/';
    return body.replace(new RegExp(baseUrl, 'g'), ''); // Elimina la base URL solo para mensajes de texto
  },

    subscribeToChannel() {
      console.log('Intentando suscribirse al canal con ID:', this.selectedChat.wa_id);
          window.Echo.private('webhooks.' + this.selectedChat.wa_id)
      .listen('webhook', (e) => {
        console.log('Evento recibido:', e);
        this.appendMessage(e.message); // Agrega o actualiza el mensaje en tu lista
        this.scrollToBottom(); // Opcional: Desplázate hacia el final del chat
      });
      },


    checkHeaderImage(message) {
      return message.data?.header_type === 'IMAGE'
    },
    appendMessage(newMessage) {
      const existingMessageIndex = this.messages.findIndex(m => m.id === newMessage.id);
      if (existingMessageIndex !== -1) {
        // Actualiza el mensaje existente
        Vue.set(this.messages, existingMessageIndex, newMessage);
      } else {
        // Agrega un nuevo mensaje
        this.messages.push(newMessage);
      }
    },
    loadMessages() {
      this.$axios.get('/messages').then(({ data }) => {
        this.items = data.data
      })
    },
    loadConversation(chat) {
      this.selectedChat = chat
      this.subscribeToChannel();
      this.$axios.get('/messages/' + chat.wa_id).then(({ data }) => {
        this.messages = data.data
        this.scrollToBottom()
      })
    },
    sendMessage() {
      const payload = {
        wa_id: this.selectedChat.wa_id,
        body: this.message,
      }
      this.$axios.post('/messages', payload).then(({ data }) => {
        console.log('Respuesta del servidor:', data);

        if (data.success && data.data.body) {
          this.messages.push({
            outgoing: data.data.outgoing,
            body: this.message,
            created_at: this.$moment(data.data.created_at).format('DD/MM/YY'),
            status: data.data.status,
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
  },
}
</script>
<style>
.message-box .v-text-field__details {
  display: none;
}

.chat-box {
  height: 80vh;
  overflow-y: scroll;
}

.message-card {
  max-width: 60%;
  padding: 2px 6px; /* Reduce el relleno para disminuir la altura total */
  max-height: 70%; /* Establece una altura máxima si es necesario */
  overflow-y: auto;
}

.chat-list {
  height: 81.8vh;
}

.wpp-bg {
  background-image: url('/bg-whatsapp.png');
  background-repeat: repeat;
  border-color: #efeae2;
}

.img-msg {
  max-width: 200px;
}
.img-sticker {
  max-width: 100px; /* Ajusta esto según tus necesidades */
  height: auto; /* Mantiene la proporción de la imagen */
  /* Otros estilos que puedas necesitar */
}



</style>
