# Generates src/static/admin/config.yml (the admin's form definitions). Run: python3 tools/make-admin-config.py
import json, os, yaml
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
st = json.load(open(os.path.join(ROOT, 'content/finances/settings.json')))
cats = [{'label': ('Spending · ' if i < len(st['expenseCategories']) else 'Income · ') + c['label'], 'value': c['id']}
        for i, c in enumerate(st['expenseCategories'] + st['incomeCategories'])]
yn = [{'label': 'Yes', 'value': 'yes'}, {'label': 'No', 'value': 'no'}, {'label': 'Partly / some', 'value': 'some'}, {'label': 'Not sure yet', 'value': 'unknown'}]

def date(label, name, req=True, hint=''):
    d = {'label': label, 'name': name, 'widget': 'datetime', 'format': 'YYYY-MM-DD', 'date_format': 'YYYY-MM-DD', 'time_format': False, 'required': req}
    if hint: d['hint'] = hint
    return d

def s(label, name, req=False, hint=''):
    d = {'label': label, 'name': name, 'widget': 'string', 'required': req}
    if hint: d['hint'] = hint
    return d

def sel(label, name, options, default=None, req=True, hint='', multiple=False):
    d = {'label': label, 'name': name, 'widget': 'select', 'options': options, 'required': req}
    if default is not None: d['default'] = default
    if hint: d['hint'] = hint
    if multiple: d['multiple'] = True
    return d

md_field = lambda label: {'label': label, 'name': 'body', 'widget': 'markdown', 'required': False, 'buttons': ['bold', 'italic', 'link', 'bulleted-list'], 'editor_components': []}

pawsome = {
    'name': 'pawsome', 'label': 'Pawsome Pooches', 'label_singular': 'Pawsome Pooch',
    'description': 'Community dogs featured each week. To mark a pup as adopted, open it, set Status to "Adopted" and add the adoption date. Adopted pups move to "Happy tails".',
    'folder': 'content/pawsome', 'create': True, 'delete': True, 'slug': '{{slug}}', 'identifier_field': 'name',
    'summary': '{{name}} · {{status}} · week of {{featuredWeek}}',
    'media_folder': '/src/assets/img/pawsome', 'public_folder': '/assets/img/pawsome',
    'sortable_fields': ['featuredWeek', 'name', 'status'],
    'view_filters': [{'label': 'Available', 'field': 'status', 'pattern': 'available'}, {'label': 'Pending', 'field': 'status', 'pattern': 'pending'}, {'label': 'Adopted', 'field': 'status', 'pattern': 'adopted'}],
    'editor': {'preview': False},
    'fields': [
        s('Name', 'name', True, 'For two dogs listed together, e.g. "Zeus & Star"'),
        {'label': 'Listed together (a pair)', 'name': 'pair', 'widget': 'boolean', 'default': False, 'required': False},
        {'label': 'Number of dogs in this listing', 'name': 'count', 'widget': 'number', 'default': 1, 'min': 1, 'required': False, 'hint': 'e.g. 2 for a pair. Used for the "pups looking" count.'},
        sel('Status', 'status', [{'label': 'Available', 'value': 'available'}, {'label': 'Adoption pending', 'value': 'pending'}, {'label': 'Adopted', 'value': 'adopted'}], 'available'),
        date('Featured week', 'featuredWeek', True, 'The week this pup is featured. The newest week gets a "New this week" ribbon.'),
        date('Adopted on', 'adoptedDate', False, 'Only when Status is Adopted'),
        {'label': 'Urgent', 'name': 'urgent', 'widget': 'boolean', 'default': False, 'required': False, 'hint': 'Shows an "Urgent" ribbon and moves the pup to the front'},
        sel('Looking for', 'needs', [{'label': 'Adopters', 'value': 'adoption'}, {'label': 'A foster', 'value': 'foster'}, {'label': 'Adopters or a foster', 'value': 'both'}], 'adoption'),
        {'label': 'Photos', 'name': 'photos', 'widget': 'list', 'required': False, 'hint': 'The first photo is the main one. Phone photos are resized automatically.', 'field': {'label': 'Photo', 'name': 'image', 'widget': 'image'}},
        s('Photo description', 'photoAlt', False, 'For people using screen readers, e.g. "Luna, a tan pit mix, sitting in the grass"'),
        s('One-line intro', 'tagline'),
        s('Breed', 'breed'), s('Age', 'age', False, 'e.g. "About 2 years"'), s('Sex', 'sex', False, 'e.g. "Female"'),
        sel('Size', 'size', ['Small', 'Medium', 'Large', 'Extra large'], req=False),
        s('Weight', 'weight', False, 'e.g. "45 lb"'),
        sel('Energy', 'energy', ['Low', 'Medium', 'High'], req=False),
        s('Adoption fee', 'fee', False, 'e.g. "$150" or "Fee waived"'),
        {'label': 'Personality', 'name': 'personality', 'widget': 'list', 'required': False, 'hint': 'Short words like "Cuddly", "Loves walks", "Shy at first"'},
        sel('Spayed or neutered', 'fixed', yn, 'unknown'), s('Spay/neuter note', 'fixedNote'),
        sel('Vaccines up to date', 'vaccinated', yn, 'unknown'),
        sel('Microchipped', 'microchipped', yn, 'unknown'),
        sel('Heartworm negative', 'heartworm', yn, 'unknown'),
        {'label': 'Medical notes', 'name': 'medical', 'widget': 'text', 'required': False},
        sel('Good with dogs', 'goodWithDogs', yn, 'unknown'),
        sel('Good with cats', 'goodWithCats', yn, 'unknown'),
        sel('Good with kids', 'goodWithKids', yn, 'unknown'),
        s('Gets-along note', 'goodNote', False, 'e.g. "Needs a home without cats"'),
        {'label': 'Where the pup is', 'name': 'location', 'widget': 'object', 'collapsed': False, 'fields': [
            sel('Type', 'type', [{'label': 'A rescue', 'value': 'rescue'}, {'label': 'MDAS · Doral (Pet Adoption and Protection Center)', 'value': 'mdas-doral'}, {'label': 'MDAS · Medley', 'value': 'mdas-medley'}, {'label': 'Broward County Animal Care', 'value': 'broward'}, {'label': 'A family rehoming', 'value': 'family'}, {'label': 'In a foster home', 'value': 'foster'}, {'label': 'Other', 'value': 'other'}], 'rescue'),
            s('Name of rescue or place', 'name', False, 'e.g. the rescue\'s name. Leave empty for shelters.'),
            s('City / area', 'city'), s('Shelter animal ID', 'animalId', False, 'e.g. A1234567')]},
        {'label': 'How to adopt / contact', 'name': 'contact', 'widget': 'object', 'collapsed': False, 'fields': [
            s('Instagram handle', 'instagram', False, 'Without the @'),
            s('Website', 'website'), s('Application link', 'applyUrl'), s('Phone', 'phone'), s('Email', 'email'),
            {'label': 'Instructions', 'name': 'instructions', 'widget': 'text', 'required': False, 'hint': 'Optional. Leave empty to use the standard steps for this location.'}]},
        md_field('Story'),
    ]}

transactions = {
    'name': 'transactions', 'label': 'Transparency: money in & out', 'label_singular': 'Ledger entry',
    'description': 'Every purchase or donation shown on the "Where the money goes" page. Upload receipts with card numbers, addresses and order IDs blacked out.',
    'folder': 'content/finances/entries', 'extension': 'json', 'format': 'json', 'create': True, 'delete': True, 'identifier_field': 'description',
    'slug': '{{fields.date}}-{{slug}}', 'summary': '{{date}} · {{type}} · ${{amount}} · {{description}}', 'sortable_fields': ['date', 'amount'],
    'media_folder': '/src/assets/finances/receipts', 'public_folder': '/assets/finances/receipts', 'editor': {'preview': False},
    'fields': [
        date('Date', 'date'),
        sel('Money', 'type', [{'label': 'Spent (expense)', 'value': 'expense'}, {'label': 'Received (income)', 'value': 'income'}], 'expense'),
        sel('Category', 'category', cats),
        s('What it was for', 'description', True, 'e.g. "Spay surgery for Luna"'),
        {'label': 'Amount ($)', 'name': 'amount', 'widget': 'number', 'value_type': 'float', 'min': 0, 'step': 0.01},
        s('Paid to / received from', 'paid_to_or_from', False, 'Business name. For donations, write "Individual donors" (never list donor names without permission).'),
        s('Dog it helped', 'dog'),
        {'label': 'Receipt', 'name': 'receipt', 'widget': 'file', 'required': False, 'hint': 'PDF or photo. Black out card numbers, addresses and order IDs first.'},
        {'label': 'Notes', 'name': 'notes', 'widget': 'text', 'required': False},
    ]}

rescues = {
    'name': 'rescues', 'label': 'Rescues you can help', 'label_singular': 'Rescue', 'description': 'Miami-Dade rescues and shelters people can support.',
    'folder': 'content/rescues', 'create': True, 'delete': True, 'slug': '{{slug}}', 'identifier_field': 'name', 'summary': '{{name}}',
    'media_folder': '/src/assets/img/rescues', 'public_folder': '/assets/img/rescues', 'editor': {'preview': False},
    'fields': [
        s('Name', 'name', True), {'label': 'Order', 'name': 'order', 'widget': 'number', 'required': False, 'hint': 'Lower numbers show first'},
        s('Instagram handle', 'instagram', False, 'Without the @'), s('Website', 'website'), s('Area / type', 'area', False, 'e.g. "Rescue · Homestead"'),
        {'label': 'Short description', 'name': 'summary', 'widget': 'text', 'required': False},
        sel('What they need', 'needs', [{'label': 'Foster homes', 'value': 'fosters'}, {'label': 'Adopters', 'value': 'adopters'}, {'label': 'Volunteers', 'value': 'volunteers'}, {'label': 'Supplies', 'value': 'supplies'}, {'label': 'Donations', 'value': 'donations'}, {'label': 'Transport', 'value': 'transport'}, {'label': 'Shares on social', 'value': 'sharing'}], req=False, multiple=True),
        s('Wishlist link', 'wishlist'), s('Donation link', 'donate'),
        {'label': 'Logo', 'name': 'logo', 'widget': 'image', 'required': False},
        md_field('How to help'),
    ]}

dogs = {
    'name': 'dogs', 'label': "Our dogs (Bentley's Playhouse)", 'label_singular': 'Dog', 'description': "Dogs in Bentley's Playhouse's own care, shown on Adopt & Foster.",
    'folder': 'content/dogs', 'create': True, 'delete': True, 'slug': '{{slug}}', 'identifier_field': 'name', 'summary': '{{name}} · {{status}}',
    'media_folder': '/src/assets/img/dogs', 'public_folder': '/assets/img/dogs', 'editor': {'preview': False},
    'fields': [
        s('Name', 'name', True),
        sel('Whose dog', 'source', [{'label': "Bentley's Playhouse", 'value': 'bentleys'}, {'label': 'Partner rescue listing', 'value': 'partner'}], 'bentleys'),
        s('Partner rescue name', 'partnerName'),
        sel('Status', 'status', [{'label': 'Available', 'value': 'available'}, {'label': 'Adoption pending', 'value': 'pending'}, {'label': 'Adopted (hidden)', 'value': 'adopted'}], 'available'),
        s('Age', 'age'), s('Sex', 'sex'), s('Size', 'size'), s('Good with', 'goodWith'), s('Energy', 'energy'), s('Medical notes', 'medical'),
        {'label': 'Photo', 'name': 'photo', 'widget': 'image', 'required': False}, s('Photo description', 'photoAlt'),
        date('Date listed', 'date', False), s('Application link for this dog', 'inquiryUrl'),
        {'label': 'Summary', 'name': 'summary', 'widget': 'text', 'required': False},
        md_field('About'),
    ]}

cfg = {
    'backend': {'name': 'github', 'repo': 'catabalzano/bentleys-playhouse', 'branch': 'main',
                'commit_messages': {'create': 'Admin: add {{collection}} "{{slug}}"', 'update': 'Admin: update {{collection}} "{{slug}}"', 'delete': 'Admin: delete {{collection}} "{{slug}}"',
                                    'uploadMedia': 'Admin: upload "{{path}}"', 'deleteMedia': 'Admin: delete "{{path}}"'}},
    'site_url': 'https://bentleysplayhouse.org', 'display_url': 'https://bentleysplayhouse.org', 'logo_url': '/assets/img/logo-main.png',
    'media_folder': 'src/assets/uploads', 'public_folder': '/assets/uploads',
    'media_libraries': {'default': {'config': {'max_file_size': 20000000, 'slugify_filename': True,
                                               'transformations': {'raster_image': {'format': 'webp', 'quality': 82, 'width': 1600, 'height': 1600}}}}},
    'slug': {'encoding': 'ascii', 'clean_accents': True},
    'collections': [pawsome, transactions, rescues, dogs],
}
out = os.path.join(ROOT, 'src/static/admin/config.yml')
open(out, 'w').write('# Admin (Sveltia CMS). Generated by tools/make-admin-config.py; edit that file, not this one.\n' + yaml.safe_dump(cfg, sort_keys=False, allow_unicode=True, width=200))
print('wrote', out)
