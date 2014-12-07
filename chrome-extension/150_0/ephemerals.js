'use strict';

pb.addEventListener('signed_in', function(e) {
    pb.addEventListener('stream_message', function(e) {
        var message = e.detail;
        if (message.type == 'push') {
            var push = message.push;
            if (pb.local.device
                && ((push.target_device_iden
                    && push.target_device_iden
                    != pb.local.device.iden)
                || (push.source_device_iden
                    && push.source_user_iden == pb.local.device.iden))) {
                return;
            }

            if (push.type == 'mirror' && pb.browserState != 'locked') {
                if (pb.options.showMirrors) {
                    showMirror(push);
                } else {
                    pb.log('Not showing mirror, disabled in options');
                }
            } else if (push.type == 'dismissal') {
                dismissMirror(push);
            } else if (push.type == 'log_request') {
                sendLog();
            }
        }
    });
});

var recentlyMirrored = [];
var showMirror = function(push) {
    for (var i = 0, length = recentlyMirrored.length; i < length; i++) {
        var recent = recentlyMirrored[i];
        if (recent.package_name == push.package_name
            && recent.title == push.title
            && recent.body == push.body
            && push.package_name != 'com.pushbullet.android'
            && recent.icon && push.icon && recent.icon.length == push.icon.length
            && !push.conversation_iden) {
            pb.log('Not notifying for identical mirror');
            return;
        }
    }

    recentlyMirrored.unshift(push);
    if (recentlyMirrored.length > 3) {
        recentlyMirrored.pop();
    }

    if (pb.options.showMirrors) {
        mirrorNotification(push);
    } else {
        pb.log('Not showing mirror, disabled in options');
        return;
    }
};

var packageNameToConversations = { };

var mirrorNotification = function(push) {
    pb.log('Mirroring notification for:');
    pb.log(push);

    if (!push.iden) {
        push.iden = '' + Date.now();
    }

    var options = { };
    options.type = 'basic';
    options.key = getKey(push);

    if (push.conversation_iden) {
        var conversations = packageNameToConversations[push.package_name];
        if (!conversations) {
            conversations = { };
            packageNameToConversations[push.package_name] = conversations;
        }

        var existingPush = conversations[options.key];
        if (existingPush && existingPush.body != push.body) {
            push.body = existingPush.body + '\n' + push.body;
        }

        var lines = push.body.split('\n');
        if (lines.length >= 3) {
            var ultimate = lines.pop();
            var penultimate = lines.pop();
            var antepenultimate = lines.pop();
            push.body = antepenultimate + '\n' + penultimate + '\n' + ultimate;
        }

        conversations[options.key] = push;
        options.onclose = function() {
            delete conversations[options.key];
        };
    }

    if (push.package_name == 'com.pushbullet.android') {
        options.title = '';
	} else if (push.package_name == 'de.yyco.silencer' && localStorage.enableEncrpyption) {	
		try {
			console.log("Encrypted: " + push.body);

			var decrypted = utils.decrypt(push.body, localStorage.encKey, push.title);
			var decryptedData = JSON.parse(decrypted);
		
			push.package_name = decryptedData.p;
			push.application_name = decryptedData.l;
			push.title = decryptedData.t;
			push.body = decryptedData.b;
			push.notification_id = decryptedData.n;
			
			options.title = push.application_name + ': ';
		}
		catch (e) {
			options.title = "Silencer: ";
			push.title = "Decryption error";
			push.body = "Ensure encryption key is correct";
			push.icon = "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";
		}
    } else {
        options.title = push.application_name + ': ';
    }

    if (push.title) {
        options.title += push.title;
    }

    options.message = push.body || '';
    options.iconUrl = 'data:image/png;base64,' + push.icon;

    var sourceDevice = pb.local.devices[push.source_device_iden];
    if (sourceDevice) {
        options.contextMessage = String.format(text.get('context_message'),
                                               sourceDevice.nickname || sourceDevice.model,
                                               new Date().toLocaleTimeString().replace(/:\d+ /, ' '));
    }

    options.onclick = function() {
        if (push.conversation_iden || messagingApps[push.package_name]) {
            pb.log('Opening quick-reply for push ' + push.iden);

            var width = 320;
            var height = 360;

            var top = Math.floor((window.screen.availHeight / 2) - (height / 2)) - 100;
            var left = Math.floor((window.screen.availWidth / 2) - (width / 2)) + 100;

            var screenX = localStorage['quickReplyScreenX'];
            var screenY = localStorage['quickReplyScreenY'];

            if (screenX && screenY) {
                top = parseInt(screenY);
                left = parseInt(screenX);
            }

            pb.openQuickReply({
                'url': 'quick-reply.html?push_iden=' + push.iden,
                'width': width,
                'height': height,
                'top': top,
                'left': left
            }, push);
        } else {
            optionallyOpenTab(push);
        }

        options.dismiss();
    };

    options.buttons = [];
    if (!pb.options.hideDisableButton && !push.conversation_iden && push.package_name != 'com.pushbullet.android') {
        options.buttons.push({
            'title': String.format(text.get('mute_app'), push.application_name),
            'short_title': text.get('mute'),
            'iconUrl': 'ic_action_halt.png',
            'onclick': function() {
                pb.post(pb.api + '/v2/ephemerals', {
                    'type': 'push',
                    'push': {
                        'type': 'mute',
                        'package_name': push.package_name,
                        'source_user_iden': push.source_user_iden
                    }
                }, function(response) {
                    if (response) {
                        pb.log('Muted ' + push.package_name);

                        var undo = {
                            'type': 'basic',
                            'key': options.key,
                            'title': String.format(text.get('muted_app'), push.application_name),
                            'message': '',
                            'iconUrl': 'data:image/png;base64,' + push.icon
                        };

                        undo.buttons = [{
                            'title': String.format(text.get('unmute_app'), push.application_name),
                            'iconUrl': 'ic_action_undo.png',
                            'onclick': function() {
                                pb.post(pb.api + '/v2/ephemerals', {
                                    'type': 'push',
                                    'push': {
                                        'type': 'unmute',
                                        'package_name': push.package_name,
                                        'source_user_iden': push.source_user_iden
                                    }
                                }, function(response) {
                                    if (response) {
                                        pb.log('Unmuted ' + push.package_name);
                                    } else {
                                        pb.log('Failed to unmute ' + push.package_name);
                                    }
                                });
                            }
                        }];

                        undo.buttons.push({
                            'title': text.get('done'),
                            'iconUrl': 'ic_action_tick.png',
                            'onclick': function() {
                            }
                        });

                        pb.notifier.show(undo);

                        setTimeout(function() {
                            pb.notifier.dismiss(undo.key);
                        }, 5000);
                    } else {
                        pb.log('Failed to mute ' + push.package_name);
                    }
                });
            }
        });
    }

    if (push.actions) {
        push.actions.map(function(action) {
            options.buttons.push({
                'title': 'Android: ' + action.label,
                'short_title': action.label,
                'iconUrl': 'ic_action_android.png',
                'onclick': function() {
                    options.dismiss(action.trigger_key);
                }
            });
        });
    }

    if (push.conversation_iden) {
        options.buttons.push({
            'title': text.get('reply'),
            'iconUrl': 'ic_action_sms.png',
            'onclick': function() {
                options.onclick();
            }
        });
    }

    if (push.dismissable && push.package_name != 'com.ingeniousapps.pushbulletquickreply') {
        options.buttons.push({
            'title': text.get('dismiss'),
            'iconUrl': 'ic_action_cancel.png',
            'onclick': function() {
                options.dismiss();
            }
        });
    }

    options.dismiss = function(triggerKey) {
        dismissRemote(push, triggerKey);
    };

    pb.ifNoNativeClientShowingMirrors(function() {
        pb.notifier.show(options);
    });
};

var dismissRemote = function(push, triggerKey) {
    var dismiss = {
        'type': 'dismissal',
        'package_name': push.package_name,
        'notification_id': push.notification_id,
        'notification_tag': push.notification_tag,
        'source_user_iden': push.source_user_iden
    };

    if (push.conversation_iden) {
        dismiss.conversation_iden = push.conversation_iden;
    }

    if (triggerKey) {
        dismiss.trigger_action = triggerKey;
    }

    pb.post(pb.api + '/v2/ephemerals', {
        'type': 'push',
        'push': dismiss
    }, function(response) {
        if (response) {
            pb.log('Triggered remote dismissal of ' + getKey(push));
        } else {
            pb.log('Failed to trigger remote dismissal of ' + getKey(push));
        }
    });
};

var dismissMirror = function(push) {
    var key = getKey(push);
    pb.notifier.dismiss(key);

    var conversations = packageNameToConversations[push.package_name];
    if (conversations) {
        Object.keys(conversations).map(function(fullKey) {
            if (fullKey.indexOf(key) != -1) {
                pb.notifier.dismiss(fullKey);
                delete conversations[fullKey];
            }
        });
    }
};

var getKey = function(push) {
    var key = push.package_name + '_' + push.notification_tag + '_' + push.notification_id;
    if (push.notification_id == null) {
        key = push.package_name || push.iden;
    }
    if (push.conversation_iden) {
        key += '_' + push.conversation_iden;
    }
    return key;
};

var redditApps = ['reddit.news', 'free.reddit.news', 'com.deeptrouble.yaarreddit', 'com.phyora.apps.reddit_now',
'com.onelouder.baconreader', 'com.onelouder.baconreader.premium', 'com.andrewshu.android.reddit',
'com.andrewshu.android.redditdonation', 'com.lightemittingsmew.redditreader', 'com.apptechnic.rapidreddit',
'com.fourpool.reddit.android', 'com.laurencedawson.reddit_sync', 'com.laurencedawson.reddit_sync.pro',
'com.laurencedawson.reddit_sync.classic', 'com.laurencedawson.reddit_sync.dev'];

var optionallyOpenTab = function(push) {
    if (push.package_name == 'com.google.android.gm') {
        var parts = push.body.split('\n');
        var email = parts[0];
        pb.openTab('https://mail.google.com/mail/u/?authuser=' + email);
    } else if (push.package_name == 'com.google.android.apps.inbox') {
        var parts = push.body.split('\n');
        var email = parts[0];
        pb.openTab('https://inbox.google.com');
    } else if (push.package_name == 'com.twitter.android') {
        pb.openTab('https://twitter.com');
    } else if (push.package_name == 'com.facebook.katana' || push.package_name == 'com.facebook.orca') {
        pb.openTab('https://www.facebook.com');
    } else if (push.package_name == 'com.google.android.apps.plus') {
        pb.openTab('https://plus.google.com/u/0/notifications/all');
    } else if (push.package_name == 'com.google.android.calendar') {
        pb.openTab('https://www.google.com/calendar');
    } else if (push.package_name == 'com.groupme.android') {
        pb.openTab('https://app.groupme.com');
    } else if (push.package_name == 'com.instagram.android') {
        pb.openTab('http://instagram.com/');
    } else if (redditApps.indexOf(push.package_name) >= 0) {
        pb.openTab('http://reddit.com');
    } else if (push.package_name == 'com.tumblr') {
        pb.openTab('https://www.tumblr.com');
    } else if (push.package_name == 'com.google.android.youtube') {
        pb.openTab('https://www.youtube.com');
    }
};

pb.openQuickReply = function(options, push) {
    if (window.chrome) {
        options.type = 'popup';
        options.focused = true;

        var listener = function(message, sender, sendResponse) {
            chrome.runtime.onMessage.removeListener(listener);

            if (message.push_iden == push.iden) {
                sendResponse(push);
            }
        };

        chrome.runtime.onMessage.addListener(listener);

        chrome.windows.create(options, function(window) {
            chrome.windows.update(window.id, { 'focused': true }, function() {
            });
        });
    } else if (window.safari) {
        var listener = function(e) {
            if (e.name == 'request_conversation_push') {
                e.target.page.dispatchMessage('conversation_push', push);
                safari.application.removeEventListener('message', listener, false);
            }
        };

        safari.application.addEventListener('message', listener, false);

        var w = safari.application.openBrowserWindow();
        w.activeTab.url = safari.extension.baseURI + options.url + '&width=' + options.width + '&height=' + options.height;
    } else {
        options.push = push;

        self.port.emit('open_quickreply', options);
    }
};

pb.sendReply = function(push, message) {
    pb.post(pb.api + '/v2/ephemerals', {
        'type': 'push',
        'push': {
            'type': 'messaging_extension_reply',
            'package_name': push.package_name,
            'source_user_iden': push.source_user_iden,
            'target_device_iden': push.source_device_iden,
            'conversation_iden': push.conversation_iden,
            'message': message
        }
    }, function(response) {
        if (response) {
            pb.log('Forwarding reply to ' + push.package_name);
        } else {
            pb.log('Failed to forward reply to ' + push.package_name);
        }
    });
};

var sendLog = function() {
    pb.log('Log data requested');

    var logData = pb.rollingLog.join('\n');

    pb.post(pb.api + '/v2/error-report', {
        'reply_to': pb.local.user.email,
        'subject': 'Browser log file requested for ' + pb.local.user.email,
        'body': '',
        'data': logData
    }, function(response) {
        if (response) {
            pb.log('Log data sent successfully');
        } else {
            pb.log('Failed to send log data');
        }
    });
};

if (!window.chrome && !window.safari) {
    self.port.on('send_reply', function(reply) {
        pb.sendReply(reply.push, reply.message);
    });
}
